import React, { useEffect, useRef, useState } from 'react';
import { Map, NavigationControl, GeolocateControl, StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { 
  Building, 
  Territory, 
  Zone, 
  Apartment, 
  BaseMapStyle, 
  LayerToggles, 
  DrawMode 
} from '../types';
import { Check, X, Undo, Box, Edit3 } from 'lucide-react';

interface MapViewProps {
  baseMap: BaseMapStyle;
  layers: LayerToggles;
  territories: Territory[];
  activeTerritory: Territory | null;
  zones: Zone[];
  buildings: Building[];
  apartments: Apartment[];
  selectedBuilding: Building | null;
  onSelectBuilding: (building: Building) => void;
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
  territories,
  activeTerritory,
  zones,
  buildings,
  apartments,
  selectedBuilding,
  onSelectBuilding,
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

  // Determine map style spec (Now including Google Maps fresh raster tiles!)
  const getStyleForBaseMap = (style: BaseMapStyle): StyleSpecification => {
    switch (style) {
      case 'GOOGLE_STREETS':
        return {
          version: 8,
          sources: {
            'google-streets-tiles': {
              type: 'raster',
              tiles: [
                'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
              ],
              tileSize: 256,
              attribution: '© Google Maps'
            }
          },
          layers: [
            {
              id: 'google-streets-layer',
              type: 'raster',
              source: 'google-streets-tiles',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        };

      case 'GOOGLE_HYBRID':
        return {
          version: 8,
          sources: {
            'google-hybrid-tiles': {
              type: 'raster',
              tiles: [
                'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
              ],
              tileSize: 256,
              attribution: '© Google Maps'
            }
          },
          layers: [
            {
              id: 'google-hybrid-layer',
              type: 'raster',
              source: 'google-hybrid-tiles',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        };

      case 'GOOGLE_SATELLITE':
        return {
          version: 8,
          sources: {
            'google-satellite-tiles': {
              type: 'raster',
              tiles: [
                'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
              ],
              tileSize: 256,
              attribution: '© Google Maps'
            }
          },
          layers: [
            {
              id: 'google-satellite-layer',
              type: 'raster',
              source: 'google-satellite-tiles',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        };

      case 'GOOGLE_TERRAIN':
        return {
          version: 8,
          sources: {
            'google-terrain-tiles': {
              type: 'raster',
              tiles: [
                'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'
              ],
              tileSize: 256,
              attribution: '© Google Maps'
            }
          },
          layers: [
            {
              id: 'google-terrain-layer',
              type: 'raster',
              source: 'google-terrain-tiles',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        };

      case 'GODS_EYE_DARK':
        return {
          version: 8,
          sources: {
            'dark-tiles': {
              type: 'raster',
              tiles: [
                'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
              ],
              tileSize: 256,
              attribution: '© CARTO, © OpenStreetMap'
            }
          },
          layers: [
            {
              id: 'dark-layer',
              type: 'raster',
              source: 'dark-tiles'
            }
          ]
        };

      case 'OSM_STREETS':
      default:
        return {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm-layer',
              type: 'raster',
              source: 'osm-tiles'
            }
          ]
        };
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initialCenter: [number, number] = activeTerritory 
      ? activeTerritory.center 
      : [-69.8860, 18.4740]; // Santo Domingo Zona Colonial

    const map = new Map({
      container: mapContainer.current,
      style: getStyleForBaseMap(baseMap),
      center: initialCenter,
      zoom: 16.2,
      pitch: 40,
      bearing: -10
    });

    mapRef.current = map;

    // Controls on desktop / top-right
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }),
      'top-right'
    );

    // Viewport tracker
    const updateViewport = () => {
      const center = map.getCenter();
      onViewportChange({
        center: [center.lng, center.lat],
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
  }, [baseMap]);

  // Handle flyTo requests
  useEffect(() => {
    if (!mapRef.current || !flyToLocation) return;
    mapRef.current.flyTo({
      center: flyToLocation.center,
      zoom: flyToLocation.zoom || 16.5,
      pitch: 40,
      speed: 1.4,
      curve: 1.2,
      essential: true
    });
  }, [flyToLocation]);

  // Clear drawing points when draw mode changes to NONE
  useEffect(() => {
    if (drawMode === 'NONE') {
      setDrawingPoints([]);
      removeDrawingLayers();
    }
  }, [drawMode]);

  // Map Click Handler for Drawing Mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: any) => {
      if (drawMode === 'NONE') return;

      const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (drawMode === 'DRAW_BUILDING_BOX') {
        // Quick box mode: 2 points define a rectangle
        if (drawingPoints.length === 0) {
          setDrawingPoints([newPoint]);
        } else if (drawingPoints.length === 1) {
          const p1 = drawingPoints[0];
          const p2 = newPoint;
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
          onCompleteDrawing(boxPolygon, 'DRAW_BUILDING_BOX');
        }
      } else {
        // Multi-point polygon mode (DRAW_BUILDING_POLYGON or DRAW_ZONE)
        setDrawingPoints(prev => [...prev, newPoint]);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [drawMode, drawingPoints, onCompleteDrawing]);

  // Update drawing layers on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (drawingPoints.length === 0) {
      removeDrawingLayers();
      return;
    }

    const pointsGeoJson: FeatureCollection = {
      type: 'FeatureCollection',
      features: drawingPoints.map((pt, i) => ({
        type: 'Feature',
        id: i,
        properties: { index: i },
        geometry: { type: 'Point', coordinates: pt }
      }))
    };

    // Construct lines or polygon preview
    const lineCoords = [...drawingPoints];
    if (drawingPoints.length > 2) {
      lineCoords.push(drawingPoints[0]); // close loop for preview
    }

    const linesGeoJson: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: drawingPoints.length > 2 ? 'Polygon' : 'LineString',
            coordinates: drawingPoints.length > 2 ? [lineCoords] : lineCoords
          } as any
        }
      ]
    };

    // Draw Source
    if (!map.getSource('draw-lines-src')) {
      map.addSource('draw-lines-src', { type: 'geojson', data: linesGeoJson });
      map.addSource('draw-points-src', { type: 'geojson', data: pointsGeoJson });

      map.addLayer({
        id: 'draw-polygon-fill',
        type: 'fill',
        source: 'draw-lines-src',
        paint: {
          'fill-color': drawMode === 'DRAW_ZONE' ? '#6366f1' : '#14b8a6',
          'fill-opacity': 0.3
        }
      });

      map.addLayer({
        id: 'draw-polygon-line',
        type: 'line',
        source: 'draw-lines-src',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2.5,
          'line-dasharray': [2, 1]
        }
      });

      map.addLayer({
        id: 'draw-points-layer',
        type: 'circle',
        source: 'draw-points-src',
        paint: {
          'circle-radius': 6,
          'circle-color': '#f59e0b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    } else {
      (map.getSource('draw-lines-src') as any).setData(linesGeoJson);
      (map.getSource('draw-points-src') as any).setData(pointsGeoJson);
    }
  }, [drawingPoints, drawMode]);

  const removeDrawingLayers = () => {
    const map = mapRef.current;
    if (!map) return;
    ['draw-points-layer', 'draw-polygon-line', 'draw-polygon-fill'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('draw-lines-src')) map.removeSource('draw-lines-src');
    if (map.getSource('draw-points-src')) map.removeSource('draw-points-src');
  };

  const handleFinishPolygon = () => {
    if (drawingPoints.length < 3) {
      alert('Se necesitan al menos 3 puntos para cerrar el polígono');
      return;
    }
    const closedCoords = [...drawingPoints, drawingPoints[0]];
    const polygon: number[][][] = [closedCoords];
    const currentMode = drawMode;
    setDrawingPoints([]);
    onCompleteDrawing(polygon, currentMode);
  };

  const handleUndoPoint = () => {
    setDrawingPoints(prev => prev.slice(0, -1));
  };

  // Helper to determine dominant status for building
  const getBuildingStatusColor = (bldId: string) => {
    const bApartments = apartments.filter(a => a.buildingId === bldId && !a.archivedAt);
    if (bApartments.length === 0) return '#3b82f6';

    const hasAccessProblem = bApartments.some(a => a.calculatedStatus === 'ACCESS_PROBLEM');
    if (hasAccessProblem) return '#ef4444';

    const allContacted = bApartments.every(a => a.calculatedStatus === 'CONTACTED');
    if (allContacted) return '#10b981';

    const someContacted = bApartments.some(a => a.calculatedStatus === 'CONTACTED');
    if (someContacted) return '#22c55e';

    const someNoAnswer = bApartments.some(a => a.calculatedStatus === 'NO_ANSWER');
    if (someNoAnswer) return '#f59e0b';

    return '#3b82f6';
  };

  // Re-render GeoJSON layers on the map
  const refreshGeoJsonLayers = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const customLayers = [
      'buildings-extrusion-layer',
      'buildings-fill-layer',
      'buildings-line-layer',
      'buildings-highlight-layer',
      'zones-fill-layer',
      'zones-line-layer',
      'territories-line-layer'
    ];

    customLayers.forEach(layerId => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    });

    if (map.getSource('buildings-src')) map.removeSource('buildings-src');
    if (map.getSource('zones-src')) map.removeSource('zones-src');
    if (map.getSource('territories-src')) map.removeSource('territories-src');

    // 1. Territories Source & Layer
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
          geometry: t.geometry
        }))
      };

      map.addSource('territories-src', {
        type: 'geojson',
        data: territoriesGeoJson
      });

      map.addLayer({
        id: 'territories-line-layer',
        type: 'line',
        source: 'territories-src',
        paint: {
          'line-color': '#0d9488',
          'line-width': 3,
          'line-dasharray': [2, 2]
        }
      });

      // 2. Zones Source & Layer with custom residential colors
      const zonesGeoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: zones.map(z => ({
          type: 'Feature',
          id: z.id,
          properties: {
            id: z.id,
            name: z.name,
            code: z.code,
            color: z.color || '#0d9488'
          },
          geometry: z.geometry
        }))
      };

      map.addSource('zones-src', {
        type: 'geojson',
        data: zonesGeoJson
      });

      map.addLayer({
        id: 'zones-fill-layer',
        type: 'fill',
        source: 'zones-src',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.16
        }
      });

      map.addLayer({
        id: 'zones-line-layer',
        type: 'line',
        source: 'zones-src',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.5
        }
      });
    }

    // 3. Buildings Source & Layer
    if (layers.buildings) {
      const buildingsGeoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: buildings.map(b => {
          const statusColor = layers.preachingStatus ? getBuildingStatusColor(b.id) : '#0284c7';
          const height = b.floors * 4.2;

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
            geometry: b.geometry
          };
        })
      };

      map.addSource('buildings-src', {
        type: 'geojson',
        data: buildingsGeoJson
      });

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
      } else {
        map.addLayer({
          id: 'buildings-fill-layer',
          type: 'fill',
          source: 'buildings-src',
          paint: {
            'fill-color': ['get', 'statusColor'],
            'fill-opacity': 0.72
          }
        });
      }

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
            1.5
          ]
        }
      });

      // Click handler
      const selectBuildingAtFeature = (e: any) => {
        if (drawMode !== 'NONE') return;
        if (!e.features || e.features.length === 0) return;
        const bId = e.features[0].properties?.id;
        const targetBuilding = buildings.find(b => b.id === bId);
        if (targetBuilding) onSelectBuilding(targetBuilding);
      };

      map.on('click', 'buildings-extrusion-layer', selectBuildingAtFeature);
      map.on('click', 'buildings-fill-layer', selectBuildingAtFeature);

      // Cursor pointer
      const setPointer = () => { if (drawMode === 'NONE') map.getCanvas().style.cursor = 'pointer'; };
      const resetPointer = () => { if (drawMode === 'NONE') map.getCanvas().style.cursor = ''; };

      map.on('mouseenter', 'buildings-extrusion-layer', setPointer);
      map.on('mouseleave', 'buildings-extrusion-layer', resetPointer);
      map.on('mouseenter', 'buildings-fill-layer', setPointer);
      map.on('mouseleave', 'buildings-fill-layer', resetPointer);
    }
  };

  useEffect(() => {
    refreshGeoJsonLayers();
  }, [layers, buildings, apartments, zones, territories, selectedBuilding]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Interactive Drawing Instructions Bar (Floating Top) */}
      {drawMode !== 'NONE' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 max-w-[92vw] w-auto">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-teal-500/50 shadow-2xl text-xs text-slate-100">
            {drawMode === 'DRAW_BUILDING_BOX' ? (
              <>
                <Box className="w-4 h-4 text-teal-400 animate-pulse flex-shrink-0" />
                <span>
                  {drawingPoints.length === 0 
                    ? '1. Haz clic en la primera esquina del edificio en el mapa' 
                    : '2. Haz clic en la esquina opuesta para completar el cuadro'}
                </span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 text-teal-400 animate-pulse flex-shrink-0" />
                <span>
                  {drawMode === 'DRAW_ZONE' ? 'Dibujar Residencial / Zona' : 'Dibujar Edificio'}:
                  {drawingPoints.length === 0
                    ? ' Haz clic para colocar el primer punto'
                    : ` ${drawingPoints.length} puntos marcados. Haz clic en más esquinas.`}
                </span>
              </>
            )}

            {/* Undo button */}
            {drawingPoints.length > 0 && drawMode !== 'DRAW_BUILDING_BOX' && (
              <button
                onClick={handleUndoPoint}
                className="ml-2 p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Deshacer último punto"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Finish Polygon */}
            {drawingPoints.length >= 3 && (
              <button
                onClick={handleFinishPolygon}
                className="ml-2 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-all shadow-md shadow-teal-900/40"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finalizar</span>
              </button>
            )}

            {/* Cancel Button */}
            <button
              onClick={() => {
                setDrawingPoints([]);
                onCancelDrawing();
              }}
              className="ml-1 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
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
