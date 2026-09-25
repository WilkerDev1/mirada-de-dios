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
import { Check, X, Undo, Box, Edit3 } from 'lucide-react';

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
  onViewportChange,
  flyToLocation,
  drawMode,
  onCompleteDrawing,
  onCancelDrawing
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  // Drawing state
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [cursorCoord, setCursorCoord] = useState<[number, number] | null>(null);

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

  // Re-render and attach all GeoJSON layers safely
  const refreshGeoJsonLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!map.isStyleLoaded()) {
      map.once('style.load', () => refreshGeoJsonLayers());
      return;
    }

    // 1. Territories Layer
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
            'fill-color': '#0284c7',
            'fill-opacity': appMode === 'TERRITORIES' ? 0.18 : 0.06
          }
        });
        map.addLayer({
          id: 'territories-line-layer',
          type: 'line',
          source: 'territories-src',
          paint: {
            'line-color': '#38bdf8',
            'line-width': appMode === 'TERRITORIES' ? 4 : 2,
            'line-dasharray': [3, 2]
          }
        });
      } else {
        (map.getSource('territories-src') as any).setData(territoriesGeoJson);
        map.setPaintProperty('territories-fill-layer', 'fill-opacity', appMode === 'TERRITORIES' ? 0.18 : 0.06);
        map.setPaintProperty('territories-line-layer', 'line-width', appMode === 'TERRITORIES' ? 4 : 2);
      }
    }

    // 2. Zones / Residenciales Layer
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
            'fill-color': ['get', 'color'],
            'fill-opacity': appMode === 'ZONES' ? 0.35 : 0.18
          }
        });
        map.addLayer({
          id: 'zones-line-layer',
          type: 'line',
          source: 'zones-src',
          paint: {
            'line-color': ['get', 'color'],
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
        map.setPaintProperty('zones-fill-layer', 'fill-opacity', appMode === 'ZONES' ? 0.35 : 0.18);
        map.setPaintProperty('zones-line-layer', 'line-width', appMode === 'ZONES' ? 3.5 : 2);
      }
    }

    // 3. Buildings Layer (High Visibility Semi-transparent & 3D Extrusion)
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
              statusColor: statusColor,
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
            'fill-color': ['get', 'statusColor'],
            'fill-opacity': 0.75
          }
        });

        // 3D Extrusion
        if (layers.threeDBuildings) {
          map.addLayer({
            id: 'buildings-extrusion-layer',
            type: 'fill-extrusion',
            source: 'buildings-src',
            paint: {
              'fill-extrusion-color': ['get', 'statusColor'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.88
            }
          });
        }

        // White crisp building outline
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
              2.0
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
        if (layers.threeDBuildings) {
          map.on('click', 'buildings-extrusion-layer', onBuildingClick);
        }

        const setPtr = () => { if (drawMode === 'NONE') map.getCanvas().style.cursor = 'pointer'; };
        const resetPtr = () => { if (drawMode === 'NONE') map.getCanvas().style.cursor = ''; };

        map.on('mouseenter', 'buildings-fill-layer', setPtr);
        map.on('mouseleave', 'buildings-fill-layer', resetPtr);
      } else {
        (map.getSource('buildings-src') as any).setData(buildingsGeoJson);
      }
    }
  }, [layers, appMode, territories, activeTerritory, zones, buildings, apartments, selectedBuilding, selectedZone, drawMode, onSelectBuilding, onSelectZone]);

  // Initialize MapLibre
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
      pitch: 35,
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
      pitch: 35,
      speed: 1.4,
      curve: 1.2,
      essential: true
    });
  }, [flyToLocation]);

  // Re-trigger layers when data or layers toggle changes
  useEffect(() => {
    refreshGeoJsonLayers();
  }, [refreshGeoJsonLayers]);

  // Interactive Live Drawing Engine (Mouse & Touch with Rubberband Feedback)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Track cursor/pointer coordinate in real time
    const handleMouseMove = (e: any) => {
      if (drawMode === 'NONE') return;
      setCursorCoord([e.lngLat.lng, e.lngLat.lat]);
    };

    const handleClick = (e: any) => {
      if (drawMode === 'NONE') return;

      const clickPt: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (drawMode === 'DRAW_BUILDING_BOX' || drawMode === 'DRAW_ZONE_BOX') {
        if (drawingPoints.length === 0) {
          // First corner
          setDrawingPoints([clickPt]);
        } else if (drawingPoints.length === 1) {
          // Second corner - completes box immediately
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
        // Multi-point polygon
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
      // Live rubberband box
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

    if (!map.getSource('draw-preview-src')) {
      map.addSource('draw-preview-src', { type: 'geojson', data: drawGeoJson });
      map.addSource('draw-markers-src', { type: 'geojson', data: markersGeoJson });

      map.addLayer({
        id: 'draw-preview-fill',
        type: 'fill',
        source: 'draw-preview-src',
        paint: {
          'fill-color': drawMode.includes('ZONE') ? '#818cf8' : '#2dd4bf',
          'fill-opacity': 0.5
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
    const closed = ensureClosedRing(drawingPoints);
    const polygon: number[][][] = [closed];
    const mode = drawMode;
    setDrawingPoints([]);
    setCursorCoord(null);
    onCompleteDrawing(polygon, mode);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Drawing Instructions Banner (Anchored at Top under Search) */}
      {drawMode !== 'NONE' && (
        <div className="absolute top-28 sm:top-24 left-1/2 -translate-x-1/2 z-40 max-w-[94vw] w-auto">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-teal-500/60 shadow-2xl text-xs text-slate-100">
            {drawMode === 'DRAW_BUILDING_BOX' || drawMode === 'DRAW_ZONE_BOX' ? (
              <>
                <Box className="w-4 h-4 text-teal-400 animate-pulse flex-shrink-0" />
                <span className="font-medium">
                  {drawingPoints.length === 0 
                    ? '1. Toca la primera esquina sobre el mapa' 
                    : '2. Mueve y toca la esquina opuesta para cerrar el cuadro'}
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
