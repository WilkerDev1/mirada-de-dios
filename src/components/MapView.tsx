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
  baseMap,
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

  // 3D / 2D flat mode state (Flat 2D by default!)
  const [is3D, setIs3D] = useState(false);

  // Drawing state
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [cursorCoord, setCursorCoord] = useState<[number, number] | null>(null);

  // Samsung S-Pen / Stylus state & hover detection
  const [isSPenDetected, setIsSPenDetected] = useState(false);
  const [sPenHover, setSPenHover] = useState<{ x: number; y: number; pressure: number } | null>(null);

  const triggerHaptic = () => {
    try {
      Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  // Helper to ensure linear rings are closed for GeoJSON Polygons
  const ensureClosedRing = (coords: number[][]): number[][] => {
    if (!coords || coords.length === 0) return [];
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      return [...coords, [first[0], first[1]]];
    }
    return coords;
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

  // Re-render and attach all GeoJSON layers safely with dynamic colors
  const refreshGeoJsonLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!map.isStyleLoaded()) {
      map.once('style.load', () => refreshGeoJsonLayers());
      return;
    }

    // 1. Territories Layer (Color-customizable)
    if (layers.territorial) {
      const territoriesGeoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: territories.map(t => ({
          type: 'Feature',
          id: t.id,
          properties: {
            id: t.id,
            name: t.name,
            code: t.code,
            color: t.color || '#0284c7',
            isActive: t.id === activeTerritory?.id
          },
          geometry: {
            type: 'Polygon',
            coordinates: [ensureClosedRing(t.geometry.coordinates[0])]
          }
        }))
      };

      if (!map.getSource('territories-src')) {
        map.addSource('territories-src', { type: 'geojson', data: territoriesGeoJson });
        map.addLayer({
          id: 'territories-fill-layer',
          type: 'fill',
          source: 'territories-src',
          paint: {
            'fill-color': ['coalesce', ['get', 'color'], '#0284c7'],
            'fill-opacity': appMode === 'TERRITORIES' ? 0.20 : 0.06
          }
        });
        map.addLayer({
          id: 'territories-line-layer',
          type: 'line',
          source: 'territories-src',
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#38bdf8'],
            'line-width': appMode === 'TERRITORIES' ? 3.5 : 2,
            'line-dasharray': [3, 2]
          }
        });

        // Click handler for territory
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
        map.setPaintProperty('territories-fill-layer', 'fill-opacity', appMode === 'TERRITORIES' ? 0.20 : 0.06);
        map.setPaintProperty('territories-line-layer', 'line-color', ['coalesce', ['get', 'color'], '#38bdf8']);
        map.setPaintProperty('territories-line-layer', 'line-width', appMode === 'TERRITORIES' ? 3.5 : 2);
      }
    }

    // 2. Zones / Residenciales Layer (Color-customizable)
    if (layers.territorial) {
      const zonesGeoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: zones.map(z => ({
          type: 'Feature',
          id: z.id,
          properties: {
            id: z.id,
            name: z.name,
            code: z.code,
            color: z.color || '#0d9488',
            isSelected: z.id === selectedZone?.id
          },
          geometry: {
            type: 'Polygon',
            coordinates: [ensureClosedRing(z.geometry.coordinates[0])]
          }
        }))
      };

      if (!map.getSource('zones-src')) {
        map.addSource('zones-src', { type: 'geojson', data: zonesGeoJson });
        map.addLayer({
          id: 'zones-fill-layer',
          type: 'fill',
          source: 'zones-src',
          paint: {
            'fill-color': ['coalesce', ['get', 'color'], '#0d9488'],
            'fill-opacity': appMode === 'ZONES' ? 0.32 : 0.16
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

        // Click zone handler in ZONES mode
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
        map.setPaintProperty('zones-fill-layer', 'fill-opacity', appMode === 'ZONES' ? 0.32 : 0.16);
        map.setPaintProperty('zones-line-layer', 'line-color', ['coalesce', ['get', 'color'], '#0d9488']);
        map.setPaintProperty('zones-line-layer', 'line-width', appMode === 'ZONES' ? 3.5 : 2);
      }
    }

    // 3. Buildings Layer (Custom Colors + Preaching Status + 2D/3D Extrusion)
    if (layers.buildings) {
      const buildingsGeoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: buildings.map(b => {
          const bApartments = apartments.filter(a => a.buildingId === b.id && !a.archivedAt);
          let statusColor = '#3b82f6'; // default vibrant blue

          if (layers.preachingStatus && bApartments.length > 0) {
            const hasAccessProblem = bApartments.some(a => a.calculatedStatus === 'ACCESS_PROBLEM');
            const allContacted = bApartments.every(a => a.calculatedStatus === 'CONTACTED');
            const someContacted = bApartments.some(a => a.calculatedStatus === 'CONTACTED');
            const someNoAnswer = bApartments.some(a => a.calculatedStatus === 'NO_ANSWER');

            if (hasAccessProblem) statusColor = '#ef4444'; // Red
            else if (allContacted) statusColor = '#10b981'; // Emerald
            else if (someContacted) statusColor = '#22c55e'; // Green
            else if (someNoAnswer) statusColor = '#f59e0b'; // Amber
          }

          // If the user specified a custom color for the building, honor it
          const finalColor = b.color || statusColor;

          const height = Math.max(8, b.floors * 4.2);
          const closedRing = ensureClosedRing(b.geometry.coordinates[0]);

          return {
            type: 'Feature',
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
              type: 'Polygon',
              coordinates: [closedRing]
            }
          };
        })
      };

      if (!map.getSource('buildings-src')) {
        map.addSource('buildings-src', { type: 'geojson', data: buildingsGeoJson });

        // 2D Fill with vivid semi-transparency
        map.addLayer({
          id: 'buildings-fill-layer',
          type: 'fill',
          source: 'buildings-src',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': is3D ? 0.2 : 0.78
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

        // Crisp building outline
        map.addLayer({
          id: 'buildings-line-layer',
          type: 'line',
          source: 'buildings-src',
          paint: {
            'line-color': '#ffffff',
            'line-width': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              4.0,
              1.8
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
        map.setPaintProperty('buildings-fill-layer', 'fill-opacity', is3D ? 0.2 : 0.78);
        map.setPaintProperty('buildings-extrusion-layer', 'fill-extrusion-color', ['get', 'color']);
        map.setPaintProperty('buildings-extrusion-layer', 'fill-extrusion-height', is3D ? ['get', 'height'] : 0);
        map.setPaintProperty('buildings-extrusion-layer', 'fill-extrusion-opacity', is3D ? 0.88 : 0);
      }
    }
  }, [layers, appMode, territories, activeTerritory, zones, buildings, apartments, selectedBuilding, selectedZone, drawMode, is3D, onSelectBuilding, onSelectZone, onSelectTerritory]);

  // Initialize MapLibre (Flat 2D default: pitch 0, bearing 0)
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
      refreshGeoJsonLayers();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update style when baseMap changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(getStyleForBaseMap(baseMap));
    mapRef.current.once('style.load', () => {
      refreshGeoJsonLayers();
    });
  }, [baseMap, refreshGeoJsonLayers]);

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

  // Re-trigger layers when data or layers toggle changes
  useEffect(() => {
    refreshGeoJsonLayers();
  }, [refreshGeoJsonLayers]);

  // Toggle 3D perspective / 2D flat mode smoothly
  const toggle3DMode = () => {
    const map = mapRef.current;
    if (!map) return;
    triggerHaptic();

    if (is3D) {
      // Return to flat 2D
      map.easeTo({ pitch: 0, bearing: 0, duration: 700 });
      setIs3D(false);
    } else {
      // Tilt to 3D perspective
      map.easeTo({ pitch: 55, duration: 700 });
      setIs3D(true);
    }
  };

  // Samsung S-Pen / Stylus & Pointer Event Handling
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'pen') {
        setIsSPenDetected(true);
        const rect = container.getBoundingClientRect();
        setSPenHover({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          pressure: e.pressure
        });
      } else if (sPenHover && e.pointerType !== 'pen') {
        setSPenHover(null);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'pen') {
        setIsSPenDetected(true);
        triggerHaptic();
      }
    };

    const handlePointerLeave = () => {
      setSPenHover(null);
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [sPenHover]);

  // Interactive Live Drawing Engine (Mouse, Touch, and S-Pen)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMouseMove = (e: any) => {
      if (drawMode === 'NONE') return;
      setCursorCoord([e.lngLat.lng, e.lngLat.lat]);
    };

    const handleClick = (e: any) => {
      if (drawMode === 'NONE') return;
      triggerHaptic();

      const clickPt: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (drawMode === 'DRAW_BUILDING_BOX' || drawMode === 'DRAW_ZONE_BOX') {
        if (drawingPoints.length === 0) {
          setDrawingPoints([clickPt]);
        } else if (drawingPoints.length === 1) {
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
          setCursorCoord(null);
          onCompleteDrawing(boxPolygon, drawMode);
        }
      } else {
        setDrawingPoints(prev => [...prev, clickPt]);
      }
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
    };
  }, [drawMode, drawingPoints, onCompleteDrawing]);

  // Live Drawing Feedback Preview Layer on the Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (drawingPoints.length === 0 && !cursorCoord) {
      removeDrawPreview();
      return;
    }

    let previewCoords: number[][] = [];

    if ((drawMode === 'DRAW_BUILDING_BOX' || drawMode === 'DRAW_ZONE_BOX') && drawingPoints.length === 1 && cursorCoord) {
      const p1 = drawingPoints[0];
      const p2 = cursorCoord;
      const minLon = Math.min(p1[0], p2[0]);
      const maxLon = Math.max(p1[0], p2[0]);
      const minLat = Math.min(p1[1], p2[1]);
      const maxLat = Math.max(p1[1], p2[1]);

      previewCoords = [
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat]
      ];
    } else if (drawingPoints.length > 0) {
      previewCoords = [...drawingPoints];
      if (cursorCoord) previewCoords.push(cursorCoord);
      if (previewCoords.length > 2) {
        previewCoords = ensureClosedRing(previewCoords);
      }
    }

    const drawGeoJson: FeatureCollection = {
      type: 'FeatureCollection',
      features: previewCoords.length >= 3 ? [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [previewCoords] }
        }
      ] : (previewCoords.length >= 2 ? [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: previewCoords }
        }
      ] : [])
    };

    const markersGeoJson: FeatureCollection = {
      type: 'FeatureCollection',
      features: drawingPoints.map((pt, i) => ({
        type: 'Feature',
        id: i,
        properties: { label: `${i + 1}` },
        geometry: { type: 'Point', coordinates: pt }
      }))
    };

    const previewColor = drawMode.includes('TERRITORY') 
      ? '#38bdf8' 
      : (drawMode.includes('ZONE') ? '#818cf8' : '#2dd4bf');

    if (!map.getSource('draw-preview-src')) {
      map.addSource('draw-preview-src', { type: 'geojson', data: drawGeoJson });
      map.addSource('draw-markers-src', { type: 'geojson', data: markersGeoJson });

      map.addLayer({
        id: 'draw-preview-fill',
        type: 'fill',
        source: 'draw-preview-src',
        paint: {
          'fill-color': previewColor,
          'fill-opacity': 0.45
        }
      });

      map.addLayer({
        id: 'draw-preview-line',
        type: 'line',
        source: 'draw-preview-src',
        paint: {
          'line-color': '#ffffff',
          'line-width': 3,
          'line-dasharray': [2, 1]
        }
      });

      map.addLayer({
        id: 'draw-markers-circle',
        type: 'circle',
        source: 'draw-markers-src',
        paint: {
          'circle-radius': 7,
          'circle-color': '#f59e0b',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff'
        }
      });
    } else {
      (map.getSource('draw-preview-src') as any).setData(drawGeoJson);
      (map.getSource('draw-markers-src') as any).setData(markersGeoJson);
      map.setPaintProperty('draw-preview-fill', 'fill-color', previewColor);
    }
  }, [drawingPoints, cursorCoord, drawMode]);

  const removeDrawPreview = () => {
    const map = mapRef.current;
    if (!map) return;
    ['draw-markers-circle', 'draw-preview-line', 'draw-preview-fill'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('draw-preview-src')) map.removeSource('draw-preview-src');
    if (map.getSource('draw-markers-src')) map.removeSource('draw-markers-src');
  };

  const handleFinishPolygon = () => {
    if (drawingPoints.length < 3) {
      alert('Se requieren al menos 3 esquinas para cerrar la forma.');
      return;
    }
    triggerHaptic();
    const closed = ensureClosedRing(drawingPoints);
    const polygon: number[][][] = [closed];
    const mode = drawMode;
    setDrawingPoints([]);
    setCursorCoord(null);
    onCompleteDrawing(polygon, mode);
  };

  return (
    <div className="relative w-full h-full select-none" style={{ touchAction: 'none' }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Samsung S-Pen Stylus Precision Reticle Overlay */}
      {sPenHover && (
        <div 
          className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
          style={{ left: sPenHover.x, top: sPenHover.y }}
        >
          <div className="relative flex items-center justify-center">
            {/* Outer precision ring */}
            <div className="w-8 h-8 rounded-full border border-teal-400/80 animate-ping opacity-60 absolute" />
            <div className="w-6 h-6 rounded-full border border-teal-400 bg-teal-400/10 shadow-[0_0_12px_rgba(45,212,191,0.6)] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            </div>

            {/* Target crosshairs */}
            <div className="absolute w-10 h-[1px] bg-teal-400/60" />
            <div className="absolute h-10 w-[1px] bg-teal-400/60" />

            {/* S-Pen Floating Badge */}
            <div className="absolute top-4 left-4 px-2 py-0.5 rounded-full bg-slate-900/90 border border-teal-500/50 text-[10px] text-teal-300 font-mono-tactical whitespace-nowrap shadow-lg">
              ✏️ S-Pen {sPenHover.pressure > 0 ? `· Presión ${(sPenHover.pressure * 100).toFixed(0)}%` : ''}
            </div>
          </div>
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

      {/* Drawing Instructions Banner (Anchored at Top under Search) */}
      {drawMode !== 'NONE' && (
        <div className="absolute top-28 sm:top-24 left-1/2 -translate-x-1/2 z-40 max-w-[94vw] w-auto">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-teal-500/60 shadow-2xl text-xs text-slate-100">
            {drawMode === 'DRAW_BUILDING_BOX' || drawMode === 'DRAW_ZONE_BOX' ? (
              <>
                <Box className="w-4 h-4 text-teal-400 animate-pulse flex-shrink-0" />
                <span className="font-medium">
                  {drawingPoints.length === 0 
                    ? '1. Toca o apunta con el S-Pen la primera esquina' 
                    : '2. Toca la esquina opuesta para completar el cuadro'}
                </span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 text-teal-400 animate-pulse flex-shrink-0" />
                <span className="font-medium">
                  {drawingPoints.length === 0 
                    ? 'Toca para marcar el primer vértice' 
                    : `${drawingPoints.length} vértices. Toca para agregar más.`}
                </span>
              </>
            )}

            {drawingPoints.length > 0 && !drawMode.includes('BOX') && (
              <button
                onClick={() => setDrawingPoints(prev => prev.slice(0, -1))}
                className="p-1 rounded-md bg-slate-800 text-slate-300"
                title="Deshacer vértice"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
            )}

            {drawingPoints.length >= 3 && !drawMode.includes('BOX') && (
              <button
                onClick={handleFinishPolygon}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </button>
            )}

            <button
              onClick={() => {
                setDrawingPoints([]);
                setCursorCoord(null);
                onCancelDrawing();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
