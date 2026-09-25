import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Map, NavigationControl, GeolocateControl, StyleSpecification } from 'maplibre-gl';
import { 
  Building, 
  Territory, 
  Zone, 
  Apartment, 
  BaseMapStyle, 
  LayerToggles, 
  DrawMode,
  AppMode
} from '../types';
import { Check, X, Undo, Box, Edit3 } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface MapViewProps {
  baseMap: BaseMapStyle;
  layers: LayerToggles;
  appMode: AppMode;
  territories: Territory[];
  activeTerritory: Territory | null;
  zones: Zone[];
  buildings: Building[];
  apartments: Apartment[];
  selectedBuilding: Building | null;
  selectedZone: Zone | null;
  onSelectBuilding: (building: Building) => void;
  onSelectZone: (zone: Zone) => void;
  onSelectTerritory?: (territory: Territory) => void;
  onViewportChange: (viewport: {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  }) => void;
  flyToLocation: { center: [number, number]; zoom?: number; timestamp: number } | null;
  drawMode: DrawMode;
  onCompleteDrawing: (coords: number[][][], mode: DrawMode) => void;
  onCancelDrawing: () => void;
}

// Robust helper to extract closed polygon coordinates from any GeoJSON structure (3D or 2D)
const extractPolygonPoints = (geom: any): [number, number][] => {
  if (!geom) return [];
  const coords = geom.coordinates;
  if (!coords || !Array.isArray(coords) || coords.length === 0) return [];
  
  let raw: any[] = [];
  // Case 1: Standard GeoJSON Polygon [[[lon, lat], ...]] (3D array)
  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    raw = coords[0];
  } 
  // Case 2: Flattened [[lon, lat], ...] (2D array)
  else if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
    raw = coords;
  }

  const valid = raw.filter(pt => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1])) as [number, number][];
  if (valid.length < 3) return [];

  // Ensure closed ring
  const first = valid[0];
  const last = valid[valid.length - 1];
  const result = [...valid];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    result.push([first[0], first[1]]);
  }
  return result;
};

// Screen-space point in polygon ray-casting test
const isPointInScreenPolygon = (px: number, py: number, points: { x: number; y: number }[]): boolean => {
  if (!points || points.length < 3) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Check if touch point is near a center badge with a generous finger touch radius
const isNearCenter = (px: number, py: number, center: { x: number; y: number } | null, radius: number): boolean => {
  if (!center) return false;
  return Math.hypot(px - center.x, py - center.y) <= radius;
};

// Earth distance calculation in meters
const getDistanceMeters = (p1: [number, number], p2: [number, number]): number => {
  const R = 6371000;
  const dLat = (p2[1] - p1[1]) * Math.PI / 180;
  const dLon = (p2[0] - p1[0]) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1[1] * Math.PI / 180) * Math.cos(p2[1] * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export const MapView: React.FC<MapViewProps> = ({
  baseMap = 'GOOGLE_STREETS',
  layers,
  territories,
  activeTerritory,
  zones,
  buildings,
  apartments,
  selectedBuilding,
  selectedZone,
  onSelectBuilding,
  onSelectZone,
  onSelectTerritory,
  onViewportChange,
  flyToLocation,
  drawMode,
  onCompleteDrawing,
  onCancelDrawing
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const currentBaseMapRef = useRef<BaseMapStyle>(baseMap);

  // Viewport tracking for reactive SVG re-projection
  const [mapTransformSeq, setMapTransformSeq] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(16.5);
  const [currentPitch, setCurrentPitch] = useState(0);
  const [is3D, setIs3D] = useState(false);

  // AutoCAD-Style Interactive Drafting State
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [activePointer, setActivePointer] = useState<{ x: number; y: number; lng: number; lat: number } | null>(null);
  const [isNearFirstPoint, setIsNearFirstPoint] = useState(false);
  const pointerDownPosRef = useRef<{ x: number; y: number; pt: [number, number] } | null>(null);

  // Mutable refs for entity selection in MapLibre tap listener
  const renderedBuildingsRef = useRef<any[]>([]);
  const renderedZonesRef = useRef<any[]>([]);
  const renderedTerritoriesRef = useRef<any[]>([]);

  const onSelectBuildingRef = useRef(onSelectBuilding);
  onSelectBuildingRef.current = onSelectBuilding;

  const onSelectZoneRef = useRef(onSelectZone);
  onSelectZoneRef.current = onSelectZone;

  const onSelectTerritoryRef = useRef(onSelectTerritory);
  onSelectTerritoryRef.current = onSelectTerritory;

  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;

  const triggerHaptic = () => {
    try {
      Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  const getStyleForBaseMap = (style: BaseMapStyle): StyleSpecification => {
    switch (style) {
      case 'GOOGLE_STREETS':
        return {
          version: 8,
          sources: {
            'base-tiles': {
              type: 'raster',
              tiles: ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'],
              tileSize: 256,
              attribution: '© Google Maps'
            }
          },
          layers: [{ id: 'base-tiles-layer', type: 'raster', source: 'base-tiles', minzoom: 0, maxzoom: 22 }]
        };

      case 'GOOGLE_SATELLITE':
        return {
          version: 8,
          sources: {
            'base-tiles': {
              type: 'raster',
              tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
              tileSize: 256,
              attribution: '© Google Maps'
            }
          },
          layers: [{ id: 'base-tiles-layer', type: 'raster', source: 'base-tiles', minzoom: 0, maxzoom: 22 }]
        };

      case 'GOOGLE_TERRAIN':
        return {
          version: 8,
          sources: {
            'base-tiles': {
              type: 'raster',
              tiles: ['https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'],
              tileSize: 256,
              attribution: '© Google Maps'
            }
          },
          layers: [{ id: 'base-tiles-layer', type: 'raster', source: 'base-tiles', minzoom: 0, maxzoom: 22 }]
        };

      case 'GODS_EYE_DARK':
        return {
          version: 8,
          sources: {
            'base-tiles': {
              type: 'raster',
              tiles: ['https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'],
              tileSize: 256,
              attribution: '© CARTO, © OpenStreetMap'
            }
          },
          layers: [{ id: 'base-tiles-layer', type: 'raster', source: 'base-tiles' }]
        };

      case 'OSM_STREETS':
        return {
          version: 8,
          sources: {
            'base-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [{ id: 'base-tiles-layer', type: 'raster', source: 'base-tiles' }]
        };

      case 'GOOGLE_HYBRID':
      default:
        return {
          version: 8,
          sources: {
            'base-tiles': {
              type: 'raster',
              tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
              tileSize: 256,
              attribution: '© Google Maps'
            }
          },
          layers: [{ id: 'base-tiles-layer', type: 'raster', source: 'base-tiles', minzoom: 0, maxzoom: 22 }]
        };
    }
  };

  // -------------------------------------------------------------
  // SUPERIMPOSED REACTIVE GRAPHICS OVERLAY ENGINE
  // -------------------------------------------------------------

  // 1. Territories Render Items
  const renderedTerritories = useMemo(() => {
    const map = mapRef.current;
    if (!map || !layers.territorial) return [];

    const list = territories.map(t => {
      const ring = extractPolygonPoints(t.geometry);
      if (ring.length < 3) return null;

      const screenPts = ring.map(pt => map.project(pt));
      const pointsAttr = screenPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

      let centerPx: { x: number; y: number } | null = null;
      if (t.center && !isNaN(t.center[0]) && !isNaN(t.center[1])) {
        centerPx = map.project(t.center);
      }

      const color = t.color || '#0284c7';
      const isActive = activeTerritory?.id === t.id;

      return {
        territory: t,
        screenPts,
        pointsAttr,
        centerPx,
        color,
        isActive
      };
    }).filter(Boolean);

    renderedTerritoriesRef.current = list;
    return list;
  }, [mapRef.current, territories, layers.territorial, activeTerritory, mapTransformSeq]);

  // 2. Zones / Residenciales Render Items
  const renderedZones = useMemo(() => {
    const map = mapRef.current;
    if (!map || !layers.territorial) return [];

    const list = zones.map(z => {
      const ring = extractPolygonPoints(z.geometry);
      if (ring.length < 3) return null;

      const screenPts = ring.map(pt => map.project(pt));
      const pointsAttr = screenPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

      let centerPx: { x: number; y: number } | null = null;
      if (z.center && !isNaN(z.center[0]) && !isNaN(z.center[1])) {
        centerPx = map.project(z.center);
      } else {
        const sumX = screenPts.reduce((acc, p) => acc + p.x, 0);
        const sumY = screenPts.reduce((acc, p) => acc + p.y, 0);
        centerPx = { x: sumX / screenPts.length, y: sumY / screenPts.length };
      }

      const color = z.color || '#6366f1';
      const isSelected = selectedZone?.id === z.id;

      return {
        zone: z,
        screenPts,
        pointsAttr,
        centerPx,
        color,
        isSelected
      };
    }).filter(Boolean);

    renderedZonesRef.current = list;
    return list;
  }, [mapRef.current, zones, layers.territorial, selectedZone, mapTransformSeq]);

  // 3. Buildings Render Items (Guaranteed 100% visible everywhere)
  const renderedBuildings = useMemo(() => {
    const map = mapRef.current;
    if (!map || !layers.buildings) return [];

    const list = buildings.map(b => {
      const ring = extractPolygonPoints(b.geometry);
      if (ring.length < 3) return null;

      const screenPts = ring.map(pt => map.project(pt));
      const pointsAttr = screenPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

      // Center Pixel
      let centerPx: { x: number; y: number } | null = null;
      if (b.center && !isNaN(b.center[0]) && !isNaN(b.center[1])) {
        centerPx = map.project(b.center);
      } else {
        const sumX = screenPts.reduce((acc, p) => acc + p.x, 0);
        const sumY = screenPts.reduce((acc, p) => acc + p.y, 0);
        centerPx = { x: sumX / screenPts.length, y: sumY / screenPts.length };
      }

      // Color calculation: custom color or preaching status
      let color = b.color || '#0d9488';
      if (!b.color && layers.preachingStatus) {
        const bApts = apartments.filter(a => a.buildingId === b.id && !a.archivedAt);
        if (bApts.length > 0) {
          if (bApts.some(a => a.calculatedStatus === 'ACCESS_PROBLEM')) color = '#ef4444';
          else if (bApts.every(a => a.calculatedStatus === 'CONTACTED')) color = '#10b981';
          else if (bApts.some(a => a.calculatedStatus === 'CONTACTED')) color = '#22c55e';
          else if (bApts.some(a => a.calculatedStatus === 'NO_ANSWER')) color = '#f59e0b';
        }
      }

      const isSelected = selectedBuilding?.id === b.id;

      // 3D Isometric Extrusion calculations when tilted
      let roofPts: { x: number; y: number }[] = [];
      let roofPointsAttr = '';
      if (currentPitch > 10) {
        const pitchFactor = Math.sin((currentPitch * Math.PI) / 180);
        const elevationPx = Math.max(8, b.floors * 4.5 * pitchFactor);
        roofPts = screenPts.map(p => ({ x: p.x, y: p.y - elevationPx }));
        roofPointsAttr = roofPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      }

      return {
        building: b,
        screenPts,
        pointsAttr,
        centerPx,
        color,
        isSelected,
        roofPts,
        roofPointsAttr
      };
    }).filter(Boolean);

    renderedBuildingsRef.current = list;
    return list;
  }, [mapRef.current, buildings, layers.buildings, layers.preachingStatus, apartments, selectedBuilding, currentPitch, mapTransformSeq]);

  // Initialize MapLibre Canvas with Native Gesture & Tap Disambiguation
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initialCenter: [number, number] = activeTerritory 
      ? activeTerritory.center 
      : [-69.8860, 18.4740];

    const map = new Map({
      container: mapContainer.current,
      style: getStyleForBaseMap(baseMap),
      center: initialCenter,
      zoom: 16.5,
      pitch: 0, // Flat 2D top-down view by default!
      bearing: 0
    });

    mapRef.current = map;

    map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }),
      'bottom-right'
    );

    let rafId: number | null = null;
    const updateViewport = () => {
      const c = map.getCenter();
      onViewportChange({
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing()
      });

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          setCurrentZoom(map.getZoom());
          setCurrentPitch(map.getPitch());
          setMapTransformSeq(s => (s + 1) % 1000000);
        });
      }
    };

    map.on('move', updateViewport);
    map.on('zoom', updateViewport);
    map.on('rotate', updateViewport);
    map.on('pitch', updateViewport);
    map.on('resize', updateViewport);
    map.on('load', updateViewport);

    // Native Tap-to-Select Listener: allows 100% unrestricted touch movement everywhere!
    map.on('click', (e) => {
      if (drawModeRef.current !== 'NONE') return;
      const { x, y } = e.point;

      // 1. Check Buildings first (highest priority)
      const hitBuilding = renderedBuildingsRef.current.find(b => {
        if (!b) return false;
        if (isPointInScreenPolygon(x, y, b.screenPts)) return true;
        if (isNearCenter(x, y, b.centerPx, 24)) return true;
        if (b.roofPts && b.roofPts.length > 0 && isPointInScreenPolygon(x, y, b.roofPts)) return true;
        return false;
      });

      if (hitBuilding && onSelectBuildingRef.current) {
        triggerHaptic();
        onSelectBuildingRef.current(hitBuilding.building);
        return;
      }

      // 2. Check Zones second
      const hitZone = renderedZonesRef.current.find(z => {
        if (!z) return false;
        if (isNearCenter(x, y, z.centerPx, 32)) return true;
        if (isPointInScreenPolygon(x, y, z.screenPts)) return true;
        return false;
      });

      if (hitZone && onSelectZoneRef.current) {
        triggerHaptic();
        onSelectZoneRef.current(hitZone.zone);
        return;
      }

      // 3. Check Territories third
      const hitTerr = renderedTerritoriesRef.current.find(t => {
        if (!t) return false;
        if (isNearCenter(x, y, t.centerPx, 32)) return true;
        if (isPointInScreenPolygon(x, y, t.screenPts)) return true;
        return false;
      });

      if (hitTerr && onSelectTerritoryRef.current) {
        triggerHaptic();
        onSelectTerritoryRef.current(hitTerr.territory);
        return;
      }
    });

    // Pointer cursor on desktop hover
    map.on('mousemove', (e) => {
      if (drawModeRef.current !== 'NONE') return;
      const { x, y } = e.point;
      const isHovering = 
        renderedBuildingsRef.current.some(b => b && (isPointInScreenPolygon(x, y, b.screenPts) || isNearCenter(x, y, b.centerPx, 24))) ||
        renderedZonesRef.current.some(z => z && (isNearCenter(x, y, z.centerPx, 32)));
      map.getCanvas().style.cursor = isHovering ? 'pointer' : '';
    });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update base map style smoothly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (currentBaseMapRef.current !== baseMap) {
      currentBaseMapRef.current = baseMap;
      map.setStyle(getStyleForBaseMap(baseMap));
      map.once('style.load', () => {
        setMapTransformSeq(s => (s + 1) % 1000000);
      });
    }
  }, [baseMap]);

  // Handle flyTo requests
  useEffect(() => {
    if (!mapRef.current || !flyToLocation) return;
    mapRef.current.flyTo({
      center: flyToLocation.center,
      zoom: flyToLocation.zoom || 17,
      pitch: is3D ? 55 : 0,
      speed: 1.4,
      curve: 1.2,
      essential: true
    });
  }, [flyToLocation, is3D]);

  // Toggle 3D perspective / 2D flat mode smoothly
  const toggle3DMode = () => {
    const map = mapRef.current;
    if (!map) return;
    triggerHaptic();

    if (is3D) {
      map.easeTo({ pitch: 0, bearing: 0, duration: 700 });
      setIs3D(false);
    } else {
      map.easeTo({ pitch: 55, duration: 700 });
      setIs3D(true);
    }
  };

  // Disable doubleClickZoom during drawing
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (drawMode !== 'NONE') {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }
  }, [drawMode]);

  // -------------------------------------------------------------
  // AutoCAD-Style Interactive Drafting Engine (Touch, S-Pen & Mouse)
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawMode === 'NONE') return;
    const map = mapRef.current;
    if (!map) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lngLat = map.unproject([x, y]);
    const clickPt: [number, number] = [lngLat.lng, lngLat.lat];
    pointerDownPosRef.current = { x, y, pt: clickPt };

    triggerHaptic();

    // 1. Box Mode (AutoCAD Rectangle Tool: 2 Corners)
    if (drawMode === 'DRAW_BUILDING_BOX' || drawMode === 'DRAW_ZONE_BOX') {
      if (drawingPoints.length === 0) {
        setDrawingPoints([clickPt]);
        setActivePointer({ x, y, lng: clickPt[0], lat: clickPt[1] });
      } else if (drawingPoints.length === 1) {
        // Complete Box
        const p1 = drawingPoints[0];
        const p2 = clickPt;
        const minLon = Math.min(p1[0], p2[0]);
        const maxLon = Math.max(p1[0], p2[0]);
        const minLat = Math.min(p1[1], p2[1]);
        const maxLat = Math.max(p1[1], p2[1]);

        const boxPolygon: number[][][] = [[
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat]
        ]];

        setDrawingPoints([]);
        setActivePointer(null);
        setIsNearFirstPoint(false);
        pointerDownPosRef.current = null;
        onCompleteDrawing(boxPolygon, drawMode);
      }
      return;
    }

    // 2. Freehand Polygon Mode (AutoCAD Polyline Tool)
    // Check if clicked near first point to close polygon (Endpoint Snap)
    if (isNearFirstPoint && drawingPoints.length >= 3) {
      handleFinishPolygon();
      return;
    }

    // Append new vertex
    setDrawingPoints(prev => [...prev, clickPt]);
    setActivePointer({ x, y, lng: clickPt[0], lat: clickPt[1] });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawMode === 'NONE') return;
    const map = mapRef.current;
    if (!map || !pointerDownPosRef.current) return;

    if (drawMode === 'DRAW_BUILDING_BOX' || drawMode === 'DRAW_ZONE_BOX') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = Math.abs(x - pointerDownPosRef.current.x);
      const dy = Math.abs(y - pointerDownPosRef.current.y);

      // If dragged across > 20px, finish the box immediately upon release!
      if (dx > 20 || dy > 20) {
        const lngLat = map.unproject([x, y]);
        const p1 = pointerDownPosRef.current.pt;
        const p2: [number, number] = [lngLat.lng, lngLat.lat];
        const minLon = Math.min(p1[0], p2[0]);
        const maxLon = Math.max(p1[0], p2[0]);
        const minLat = Math.min(p1[1], p2[1]);
        const maxLat = Math.max(p1[1], p2[1]);

        const boxPolygon: number[][][] = [[
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat]
        ]];

        triggerHaptic();
        setDrawingPoints([]);
        setActivePointer(null);
        setIsNearFirstPoint(false);
        pointerDownPosRef.current = null;
        onCompleteDrawing(boxPolygon, drawMode);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawMode === 'NONE') return;
    const map = mapRef.current;
    if (!map) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lngLat = map.unproject([x, y]);

    // Check distance to first point for AutoCAD Endpoint Snap
    if (drawingPoints.length >= 3) {
      const firstPixel = map.project(drawingPoints[0]);
      const distPx = Math.hypot(x - firstPixel.x, y - firstPixel.y);
      if (distPx <= 26) {
        setIsNearFirstPoint(true);
        setActivePointer({ x: firstPixel.x, y: firstPixel.y, lng: drawingPoints[0][0], lat: drawingPoints[0][1] });
        return;
      } else {
        setIsNearFirstPoint(false);
      }
    } else {
      setIsNearFirstPoint(false);
    }

    setActivePointer({ x, y, lng: lngLat.lng, lat: lngLat.lat });
  };

  const handleFinishPolygon = () => {
    if (drawingPoints.length < 3) {
      alert('Se requieren al menos 3 esquinas para cerrar la forma.');
      return;
    }
    triggerHaptic();
    const closed = extractPolygonPoints({ coordinates: [drawingPoints] });
    if (closed.length < 4) {
      alert('Geometría no válida. Agrega más puntos.');
      return;
    }
    const polygon: number[][][] = [closed];
    const mode = drawMode;
    setDrawingPoints([]);
    setActivePointer(null);
    setIsNearFirstPoint(false);
    onCompleteDrawing(polygon, mode);
  };

  // Screen Projected Points for AutoCAD SVG Overlay
  const map = mapRef.current;
  const projectedScreenPoints = (map && drawingPoints.length > 0)
    ? drawingPoints.map(p => map.project(p))
    : [];

  const themeColor = drawMode.includes('TERRITORY') 
    ? '#0284c7' 
    : (drawMode.includes('ZONE') ? '#6366f1' : '#0d9488');
  
  const themeFill = drawMode.includes('TERRITORY')
    ? 'rgba(2, 132, 199, 0.35)'
    : (drawMode.includes('ZONE') ? 'rgba(99, 102, 241, 0.35)' : 'rgba(13, 148, 136, 0.35)');

  return (
    <div className="relative w-full h-full select-none" style={{ touchAction: 'none' }}>
      {/* 1. MapLibre Canvas Container (Base Map: Unrestricted 100% Touch Screen) */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* 2. SUPERIMPOSED VECTOR GRAPHICS OVERLAY (Passes all gestures cleanly through to MapLibre!) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-10">
        <defs>
          <filter id="svg-elevation-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Level A: Territories (Visual Only, 100% Touch-Through) */}
        {renderedTerritories.map(item => item && (
          <g key={item.territory.id} style={{ pointerEvents: 'none' }}>
            <polygon
              points={item.pointsAttr}
              fill={item.color}
              fillOpacity={item.isActive ? 0.20 : 0.09}
              stroke={item.color}
              strokeWidth={item.isActive ? 3.5 : 2}
              strokeDasharray="8 4"
            />
            {item.centerPx && currentZoom < 16 && (
              <text
                x={item.centerPx.x}
                y={item.centerPx.y}
                fill="#ffffff"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                className="font-mono-tactical"
                style={{ textShadow: '0 2px 5px rgba(0,0,0,0.9)' }}
              >
                {item.territory.code}
              </text>
            )}
          </g>
        ))}

        {/* Level B: Zones / Residenciales (Visual Only, 100% Touch-Through) */}
        {renderedZones.map(item => item && (
          <g key={item.zone.id} style={{ pointerEvents: 'none' }}>
            <polygon
              points={item.pointsAttr}
              fill={item.color}
              fillOpacity={item.isSelected ? 0.35 : 0.20}
              stroke={item.color}
              strokeWidth={item.isSelected ? 3.5 : 2}
              strokeDasharray="6 3"
              strokeLinejoin="round"
            />
            {item.centerPx && currentZoom >= 13 && (() => {
              const labelText = item.zone.name || item.zone.code || 'Residencial';
              const textWidth = Math.max(80, labelText.length * 7.5 + 24);
              return (
                <g transform={`translate(${item.centerPx.x}, ${item.centerPx.y})`}>
                  <rect
                    x={-textWidth / 2}
                    y={-11}
                    width={textWidth}
                    height={22}
                    rx={11}
                    fill="rgba(15, 23, 42, 0.92)"
                    stroke={item.color}
                    strokeWidth={1.5}
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                  />
                  <text
                    x={0}
                    y={4}
                    fill="#ffffff"
                    fontSize={10}
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono-tactical"
                  >
                    {labelText}
                  </text>
                </g>
              );
            })()}
          </g>
        ))}

        {/* Level C: Buildings & Houses (Visual Only, 100% Touch-Through) */}
        {renderedBuildings.map(item => {
          if (!item) return null;
          const is3DActive = currentPitch > 10 && item.roofPts.length > 0;

          return (
            <g
              key={item.building.id}
              style={{ pointerEvents: 'none' }}
              filter="url(#svg-elevation-shadow)"
              className="transition-opacity duration-150"
            >
              {/* If 3D mode: render ground footprint shadow and 3D walls */}
              {is3DActive ? (
                <>
                  {/* Ground Shadow */}
                  <polygon
                    points={item.pointsAttr}
                    fill="rgba(0,0,0,0.4)"
                  />
                  {/* Isometric Walls */}
                  {item.screenPts.map((p1, idx) => {
                    const nextIdx = (idx + 1) % item.screenPts.length;
                    const p2 = item.screenPts[nextIdx];
                    const r1 = item.roofPts[idx];
                    const r2 = item.roofPts[nextIdx];
                    const wallPoints = `${p1.x},${p1.y} ${p2.x},${p2.y} ${r2.x},${r2.y} ${r1.x},${r1.y}`;
                    return (
                      <polygon
                        key={idx}
                        points={wallPoints}
                        fill={item.color}
                        fillOpacity={0.72}
                        stroke={item.isSelected ? '#ffffff' : item.color}
                        strokeWidth={1}
                      />
                    );
                  })}
                  {/* Elevated Roof */}
                  <polygon
                    points={item.roofPointsAttr}
                    fill={item.color}
                    fillOpacity={item.isSelected ? 0.95 : 0.88}
                    stroke={item.isSelected ? '#ffffff' : '#ffffff'}
                    strokeWidth={item.isSelected ? 3.5 : 1.8}
                    strokeLinejoin="round"
                  />
                </>
              ) : (
                /* Flat 2D Mode: High-contrast architectural footprint */
                <polygon
                  points={item.pointsAttr}
                  fill={item.color}
                  fillOpacity={item.isSelected ? 0.78 : 0.58}
                  stroke={item.isSelected ? '#ffffff' : item.color}
                  strokeWidth={item.isSelected ? 4 : 2.4}
                  strokeLinejoin="round"
                />
              )}

              {/* CAD Vertex Nodes */}
              {item.screenPts.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={item.isSelected ? 3.5 : 2}
                  fill="#ffffff"
                  stroke={item.color}
                  strokeWidth={1}
                />
              ))}

              {/* Center Building Label Badge (visible when zoom >= 15.5) */}
              {item.centerPx && currentZoom >= 15.5 && (
                <g transform={`translate(${item.centerPx.x}, ${is3DActive ? item.centerPx.y - 14 : item.centerPx.y})`}>
                  <rect
                    x={-30}
                    y={-10}
                    width={60}
                    height={20}
                    rx={5}
                    fill="rgba(15, 23, 42, 0.92)"
                    stroke={item.isSelected ? '#ffffff' : item.color}
                    strokeWidth={item.isSelected ? 2 : 1}
                  />
                  <text
                    x={0}
                    y={4}
                    fill="#ffffff"
                    fontSize={9}
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono-tactical"
                  >
                    {item.building.name.length > 10 ? item.building.name.substring(0, 9) + '…' : item.building.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* 3. Floating 3D / 2D Switcher (Google Maps style, safely relocated away from bottom controls) */}
      <div className="absolute top-28 sm:top-24 right-3.5 z-20">
        <button
          onClick={toggle3DMode}
          className={`w-10 h-10 rounded-2xl border font-bold text-xs shadow-2xl flex items-center justify-center transition-all active:scale-95 ${
            is3D
              ? 'bg-teal-500 text-slate-950 border-teal-300 ring-2 ring-teal-400 shadow-teal-500/30'
              : 'bg-slate-900/95 hover:bg-slate-800 text-slate-200 border-slate-700'
          }`}
          title={is3D ? "Cambiar a mapa plano 2D" : "Cambiar a vista 3D con relieve"}
        >
          {is3D ? '2D' : '3D'}
        </button>
      </div>

      {/* 4. AutoCAD-Grade Real-Time Interactive Drafting Overlay */}
      {drawMode !== 'NONE' && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute inset-0 w-full h-full z-30 cursor-crosshair"
          style={{ touchAction: 'none' }}
        >
          <svg className="w-full h-full pointer-events-none overflow-visible">
            {/* 1. AutoCAD Hairline Crosshairs centered on current pointer */}
            {activePointer && (
              <g opacity="0.45">
                <line x1="0" y1={activePointer.y} x2="100%" y2={activePointer.y} stroke={themeColor} strokeWidth="1" strokeDasharray="5 5" />
                <line x1={activePointer.x} y1="0" x2={activePointer.x} y2="100%" stroke={themeColor} strokeWidth="1" strokeDasharray="5 5" />
                <rect x={activePointer.x - 7} y={activePointer.y - 7} width="14" height="14" fill="none" stroke={themeColor} strokeWidth="1.5" />
              </g>
            )}

            {/* 2. Box Mode (AutoCAD Rectangle Tool) */}
            {(drawMode === 'DRAW_BUILDING_BOX' || drawMode === 'DRAW_ZONE_BOX') && projectedScreenPoints.length === 1 && activePointer && (
              <g>
                {/* Real-time filled rectangle preview */}
                <rect
                  x={Math.min(projectedScreenPoints[0].x, activePointer.x)}
                  y={Math.min(projectedScreenPoints[0].y, activePointer.y)}
                  width={Math.abs(activePointer.x - projectedScreenPoints[0].x)}
                  height={Math.abs(activePointer.y - projectedScreenPoints[0].y)}
                  fill={themeFill}
                  stroke={themeColor}
                  strokeWidth="3"
                  strokeDasharray="4 2"
                />
                {/* Dimension label */}
                <text
                  x={(projectedScreenPoints[0].x + activePointer.x) / 2}
                  y={Math.min(projectedScreenPoints[0].y, activePointer.y) - 10}
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono-tactical"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
                >
                  {getDistanceMeters(drawingPoints[0], [activePointer.lng, activePointer.lat])} m
                </text>
              </g>
            )}

            {/* 3. Freehand Polygon Mode (AutoCAD Polyline & Hatch Fill) */}
            {projectedScreenPoints.length >= 2 && activePointer && (
              <g>
                {/* Real-time filled interior polygon preview */}
                <polygon
                  points={[...projectedScreenPoints, activePointer].map(p => `${p.x},${p.y}`).join(' ')}
                  fill={themeFill}
                  stroke="none"
                />
                {/* Closing guide line leading back to Point 1 */}
                <line
                  x1={activePointer.x}
                  y1={activePointer.y}
                  x2={projectedScreenPoints[0].x}
                  y2={projectedScreenPoints[0].y}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  opacity="0.85"
                />
              </g>
            )}

            {/* Fixed Segments already placed */}
            {projectedScreenPoints.length >= 2 && (
              <polyline
                points={projectedScreenPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={themeColor}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Dynamic Rubberband Line from last placed point to current pointer */}
            {projectedScreenPoints.length >= 1 && activePointer && !drawMode.includes('BOX') && (
              <g>
                <line
                  x1={projectedScreenPoints[projectedScreenPoints.length - 1].x}
                  y1={projectedScreenPoints[projectedScreenPoints.length - 1].y}
                  x2={activePointer.x}
                  y2={activePointer.y}
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray="5 3"
                />
                <circle cx={activePointer.x} cy={activePointer.y} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
              </g>
            )}

            {/* Placed Vertex Nodes with AutoCAD node rings */}
            {projectedScreenPoints.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="7" fill={i === 0 ? '#f59e0b' : themeColor} stroke="#ffffff" strokeWidth="2.5" />
                <text
                  x={p.x + 9}
                  y={p.y - 7}
                  fill="#ffffff"
                  fontSize={11}
                  fontWeight="bold"
                  className="font-mono-tactical"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
                >
                  {i === 0 ? 'P1' : `P${i + 1}`}
                </text>
              </g>
            ))}

            {/* AutoCAD Endpoint Snap (Pulsing Amber Box on P1) */}
            {isNearFirstPoint && projectedScreenPoints.length >= 3 && (
              <g>
                <rect
                  x={projectedScreenPoints[0].x - 12}
                  y={projectedScreenPoints[0].y - 12}
                  width="24"
                  height="24"
                  fill="rgba(245, 158, 11, 0.25)"
                  stroke="#f59e0b"
                  strokeWidth="3"
                  className="animate-pulse"
                />
                <text
                  x={projectedScreenPoints[0].x}
                  y={projectedScreenPoints[0].y - 18}
                  fill="#f59e0b"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono-tactical"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
                >
                  🎯 Clic para cerrar
                </text>
              </g>
            )}
          </svg>
        </div>
      )}

      {/* 5. AutoCAD Drafting Control Bar (Anchored at Top under Search) */}
      {drawMode !== 'NONE' && (
        <div className="absolute top-28 sm:top-24 left-1/2 -translate-x-1/2 z-40 max-w-[94vw] w-auto">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-teal-500/60 shadow-2xl text-xs text-slate-100">
            {drawMode === 'DRAW_BUILDING_BOX' || drawMode === 'DRAW_ZONE_BOX' ? (
              <>
                <Box className="w-4 h-4 text-teal-400 animate-pulse flex-shrink-0" />
                <span className="font-medium">
                  {drawingPoints.length === 0 
                    ? '1. Toca o arrastra la primera esquina sobre el mapa' 
                    : '2. Mueve y toca la esquina opuesta para cerrar'}
                </span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 text-teal-400 animate-pulse flex-shrink-0" />
                <span className="font-medium">
                  {drawingPoints.length === 0 
                    ? 'Toca para marcar el punto P1' 
                    : `${drawingPoints.length} vértices. Toca el siguiente punto o P1 para cerrar.`}
                </span>
              </>
            )}

            {drawingPoints.length > 0 && !drawMode.includes('BOX') && (
              <button
                onClick={() => setDrawingPoints(prev => prev.slice(0, -1))}
                className="p-1 rounded-md bg-slate-800 text-slate-300 hover:text-white"
                title="Deshacer vértice"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
            )}

            {drawingPoints.length >= 3 && !drawMode.includes('BOX') && (
              <button
                onClick={handleFinishPolygon}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-md active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Cerrar ({drawingPoints.length}v)</span>
              </button>
            )}

            <button
              onClick={() => {
                setDrawingPoints([]);
                setActivePointer(null);
                setIsNearFirstPoint(false);
                onCancelDrawing();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
              title="Cancelar dibujo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
