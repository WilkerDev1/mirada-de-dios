import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map, NavigationControl, GeolocateControl, StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
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
import { Check, X, Undo, Box, Edit3, Compass, Sparkles } from 'lucide-react';
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

export const MapView: React.FC<MapViewProps> = ({
  baseMap = 'GOOGLE_STREETS',
  layers,
  appMode,
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

  // 3D / 2D flat mode state (Flat 2D by default!)
  const [is3D, setIs3D] = useState(false);

  // AutoCAD-Style Interactive Drawing State
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [activePointer, setActivePointer] = useState<{ x: number; y: number; lng: number; lat: number } | null>(null);
  const [isNearFirstPoint, setIsNearFirstPoint] = useState(false);

  // Samsung S-Pen / Stylus state
  const [isSPenDetected, setIsSPenDetected] = useState(false);
  const [sPenPressure, setSPenPressure] = useState(0);

  const triggerHaptic = () => {
    try {
      Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  // Helper to ensure linear rings are strictly closed and valid for GeoJSON Polygons (>= 4 points)
  const ensureValidPolygon = (coords: number[][]): number[][] => {
    if (!coords || coords.length < 3) return [];
    const valid = coords.filter(pt => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]));
    if (valid.length < 3) return [];
    const first = valid[0];
    const last = valid[valid.length - 1];
    const result = [...valid];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      result.push([first[0], first[1]]);
    }
    if (result.length < 4) return [];
    return result;
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

  const getStyleForBaseMap = (style: BaseMapStyle): StyleSpecification => {
    const glyphsUrl = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
    switch (style) {
      case 'GOOGLE_STREETS':
        return {
          version: 8,
          glyphs: glyphsUrl,
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
          glyphs: glyphsUrl,
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
          glyphs: glyphsUrl,
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
          glyphs: glyphsUrl,
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
          glyphs: glyphsUrl,
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
          glyphs: glyphsUrl,
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

  // Synchronize GeoJSON sources and layers safely without infinite reload loops
  const syncMapLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // 1. Territories Layer
    if (layers.territorial) {
      const terrFeatures = territories
        .map(t => {
          const ring = ensureValidPolygon(t.geometry?.coordinates?.[0]);
          if (ring.length < 4) return null;
          return {
            type: 'Feature' as const,
            id: t.id,
            properties: {
              id: t.id,
              name: t.name,
              code: t.code,
              color: t.color || '#0284c7',
              isActive: t.id === activeTerritory?.id
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [ring]
            }
          };
        })
        .filter(Boolean);

      const territoriesGeoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: terrFeatures as any
      };

      try {
        if (!map.getSource('territories-src')) {
          map.addSource('territories-src', { type: 'geojson', data: territoriesGeoJson });
          map.addLayer({
            id: 'territories-fill-layer',
            type: 'fill',
            source: 'territories-src',
            paint: {
              'fill-color': ['coalesce', ['get', 'color'], '#0284c7'],
              'fill-opacity': appMode === 'TERRITORIES' ? 0.22 : 0.08
            }
          });
          map.addLayer({
            id: 'territories-line-layer',
            type: 'line',
            source: 'territories-src',
            paint: {
              'line-color': ['coalesce', ['get', 'color'], '#0284c7'],
              'line-width': appMode === 'TERRITORIES' ? 3.5 : 2,
              'line-dasharray': [3, 2]
            }
          });

          map.on('click', 'territories-fill-layer', (e) => {
            if (drawMode !== 'NONE') return;
            if (appMode === 'TERRITORIES') {
              const tId = e.features?.[0]?.properties?.id;
              const targetTerr = territories.find(t => t.id === tId);
              if (targetTerr && onSelectTerritory) onSelectTerritory(targetTerr);
            }
          });
        } else {
          (map.getSource('territories-src') as any).setData(territoriesGeoJson);
          map.setPaintProperty('territories-fill-layer', 'fill-color', ['coalesce', ['get', 'color'], '#0284c7']);
          map.setPaintProperty('territories-fill-layer', 'fill-opacity', appMode === 'TERRITORIES' ? 0.22 : 0.08);
          map.setPaintProperty('territories-line-layer', 'line-color', ['coalesce', ['get', 'color'], '#0284c7']);
          map.setPaintProperty('territories-line-layer', 'line-width', appMode === 'TERRITORIES' ? 3.5 : 2);
        }
      } catch (err) {
        console.warn('Error syncing territories layer:', err);
      }
    }

    // 2. Zones / Residenciales Layer
    if (layers.territorial) {
      const zoneFeatures = zones
        .map(z => {
          const ring = ensureValidPolygon(z.geometry?.coordinates?.[0]);
          if (ring.length < 4) return null;
          return {
            type: 'Feature' as const,
            id: z.id,
            properties: {
              id: z.id,
              name: z.name,
              code: z.code,
              color: z.color || '#0d9488',
              isSelected: z.id === selectedZone?.id
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [ring]
            }
          };
        })
        .filter(Boolean);

      const zonesGeoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: zoneFeatures as any
      };

      try {
        if (!map.getSource('zones-src')) {
          map.addSource('zones-src', { type: 'geojson', data: zonesGeoJson });
          map.addLayer({
            id: 'zones-fill-layer',
            type: 'fill',
            source: 'zones-src',
            paint: {
              'fill-color': ['coalesce', ['get', 'color'], '#0d9488'],
              'fill-opacity': appMode === 'ZONES' ? 0.35 : 0.18
            }
          });
          map.addLayer({
            id: 'zones-line-layer',
            type: 'line',
            source: 'zones-src',
            paint: {
              'line-color': ['coalesce', ['get', 'color'], '#0d9488'],
              'line-width': appMode === 'ZONES' ? 3.5 : 2
            }
          });

          map.on('click', 'zones-fill-layer', (e) => {
            if (drawMode !== 'NONE') return;
            if (appMode === 'ZONES') {
              const zId = e.features?.[0]?.properties?.id;
              const targetZone = zones.find(z => z.id === zId);
              if (targetZone) onSelectZone(targetZone);
            }
          });
        } else {
          (map.getSource('zones-src') as any).setData(zonesGeoJson);
          map.setPaintProperty('zones-fill-layer', 'fill-color', ['coalesce', ['get', 'color'], '#0d9488']);
          map.setPaintProperty('zones-fill-layer', 'fill-opacity', appMode === 'ZONES' ? 0.35 : 0.18);
          map.setPaintProperty('zones-line-layer', 'line-color', ['coalesce', ['get', 'color'], '#0d9488']);
          map.setPaintProperty('zones-line-layer', 'line-width', appMode === 'ZONES' ? 3.5 : 2);
        }
      } catch (err) {
        console.warn('Error syncing zones layer:', err);
      }
    }

    // 3. Buildings Layer (Crystal-clear visibility on Google Streets!)
    if (layers.buildings) {
      const bldFeatures = buildings
        .map(b => {
          const ring = ensureValidPolygon(b.geometry?.coordinates?.[0]);
          if (ring.length < 4) return null;

          const bApartments = apartments.filter(a => a.buildingId === b.id && !a.archivedAt);
          let statusColor = '#3b82f6'; // default vibrant blue

          if (layers.preachingStatus && bApartments.length > 0) {
            const hasAccessProblem = bApartments.some(a => a.calculatedStatus === 'ACCESS_PROBLEM');
            const allContacted = bApartments.every(a => a.calculatedStatus === 'CONTACTED');
            const someContacted = bApartments.some(a => a.calculatedStatus === 'CONTACTED');
            const someNoAnswer = bApartments.some(a => a.calculatedStatus === 'NO_ANSWER');

            if (hasAccessProblem) statusColor = '#ef4444';
            else if (allContacted) statusColor = '#10b981';
            else if (someContacted) statusColor = '#22c55e';
            else if (someNoAnswer) statusColor = '#f59e0b';
          }

          const finalColor = b.color || statusColor;
          const height = Math.max(8, b.floors * 4.2);

          return {
            type: 'Feature' as const,
            id: b.id,
            properties: {
              id: b.id,
              name: b.name,
              address: b.address,
              floors: b.floors,
              height: height,
              color: finalColor,
              isSelected: b.id === selectedBuilding?.id
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [ring]
            }
          };
        })
        .filter(Boolean);

      const buildingsGeoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: bldFeatures as any
      };

      try {
        if (!map.getSource('buildings-src')) {
          map.addSource('buildings-src', { type: 'geojson', data: buildingsGeoJson });

          // 2D Fill (High opacity & vibrancy for Street map visibility)
          map.addLayer({
            id: 'buildings-fill-layer',
            type: 'fill',
            source: 'buildings-src',
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': is3D ? 0.25 : 0.82
            }
          });

          // 3D Extrusion
          map.addLayer({
            id: 'buildings-extrusion-layer',
            type: 'fill-extrusion',
            source: 'buildings-src',
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-height': is3D ? ['get', 'height'] : 0,
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': is3D ? 0.88 : 0
            }
          });

          // Bright crisp border
          map.addLayer({
            id: 'buildings-line-layer',
            type: 'line',
            source: 'buildings-src',
            paint: {
              'line-color': '#ffffff',
              'line-width': [
                'case',
                ['boolean', ['get', 'isSelected'], false],
                4.5,
                2.2
              ]
            }
          });

          // Click handler
          const onBuildingClick = (e: any) => {
            if (drawMode !== 'NONE') return;
            const bId = e.features?.[0]?.properties?.id;
            const target = buildings.find(b => b.id === bId);
            if (target) onSelectBuilding(target);
          };

          map.on('click', 'buildings-fill-layer', onBuildingClick);
          map.on('click', 'buildings-extrusion-layer', onBuildingClick);

          const setPtr = () => { if (drawMode === 'NONE') map.getCanvas().style.cursor = 'pointer'; };
          const resetPtr = () => { if (drawMode === 'NONE') map.getCanvas().style.cursor = ''; };
          map.on('mouseenter', 'buildings-fill-layer', setPtr);
          map.on('mouseleave', 'buildings-fill-layer', resetPtr);
        } else {
          (map.getSource('buildings-src') as any).setData(buildingsGeoJson);
          map.setPaintProperty('buildings-fill-layer', 'fill-color', ['get', 'color']);
          map.setPaintProperty('buildings-fill-layer', 'fill-opacity', is3D ? 0.25 : 0.82);
          map.setPaintProperty('buildings-extrusion-layer', 'fill-extrusion-color', ['get', 'color']);
          map.setPaintProperty('buildings-extrusion-layer', 'fill-extrusion-height', is3D ? ['get', 'height'] : 0);
          map.setPaintProperty('buildings-extrusion-layer', 'fill-extrusion-opacity', is3D ? 0.88 : 0);
        }
      } catch (err) {
        console.warn('Error syncing buildings layer:', err);
      }
    }
  }, [layers, appMode, territories, activeTerritory, zones, buildings, apartments, selectedBuilding, selectedZone, drawMode, is3D, onSelectBuilding, onSelectZone, onSelectTerritory]);

  // Initialize MapLibre (Flat 2D default: pitch 0, bearing 0 on Google Streets)
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

    const updateViewport = () => {
      const c = map.getCenter();
      onViewportChange({
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing()
      });
    };

    map.on('move', updateViewport);
    map.on('load', () => {
      updateViewport();
      syncMapLayers();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update style ONLY when baseMap actually changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (currentBaseMapRef.current !== baseMap) {
      currentBaseMapRef.current = baseMap;
      map.setStyle(getStyleForBaseMap(baseMap));
      map.once('style.load', () => {
        syncMapLayers();
      });
    }
  }, [baseMap, syncMapLayers]);

  // Re-sync layers whenever data changes
  useEffect(() => {
    syncMapLayers();
  }, [syncMapLayers]);

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

  // Disable doubleClickZoom during drawing to avoid accidental auto-zoom or multiple clicks
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
  // AutoCAD-Style Interactive Drawing Engine (Touch, S-Pen & Mouse)
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawMode === 'NONE') return;
    const map = mapRef.current;
    if (!map) return;

    if (e.pointerType === 'pen') {
      setIsSPenDetected(true);
      setSPenPressure(e.pressure);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lngLat = map.unproject([x, y]);
    const clickPt: [number, number] = [lngLat.lng, lngLat.lat];

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

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawMode === 'NONE') return;
    const map = mapRef.current;
    if (!map) return;

    if (e.pointerType === 'pen') {
      setIsSPenDetected(true);
      setSPenPressure(e.pressure);
    }

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
    const closed = ensureValidPolygon(drawingPoints);
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
      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* AutoCAD-Grade Real-Time Interactive Drafting Overlay */}
      {drawMode !== 'NONE' && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
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
                  fontSize="11"
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

      {/* Floating 3D / 2D Switcher (Google Maps style) */}
      <div className="absolute bottom-28 right-3.5 z-20 flex flex-col gap-2">
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

        {/* S-Pen Status Indicator */}
        {isSPenDetected && (
          <div 
            className="w-10 h-10 rounded-2xl bg-slate-900/95 border border-teal-500/60 text-teal-400 font-bold text-xs shadow-2xl flex items-center justify-center"
            title="S-Pen de Samsung activo"
          >
            ✏️
          </div>
        )}
      </div>

      {/* AutoCAD Drafting Control Bar (Anchored at Top under Search) */}
      {drawMode !== 'NONE' && (
        <div className="absolute top-28 sm:top-24 left-1/2 -translate-x-1/2 z-40 max-w-[94vw] w-auto">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-teal-500/60 shadow-2xl text-xs text-slate-100">
            {drawMode === 'DRAW_BUILDING_BOX' || drawMode === 'DRAW_ZONE_BOX' ? (
              <>
                <Box className="w-4 h-4 text-teal-400 animate-pulse flex-shrink-0" />
                <span className="font-medium">
                  {drawingPoints.length === 0 
                    ? '1. Toca la primera esquina sobre el mapa' 
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
