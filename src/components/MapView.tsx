import React, { useEffect, useRef } from 'react';
import { Map, NavigationControl, GeolocateControl, StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { Building, Territory, Zone, Apartment, BaseMapStyle, LayerToggles } from '../types';

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
  flyToLocation
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  // Determine map style spec
  const getStyleForBaseMap = (style: BaseMapStyle): StyleSpecification => {
    switch (style) {
      case 'SATELLITE':
        return {
          version: 8,
          sources: {
            'satellite-tiles': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              attribution: 'Esri, Maxar, Earthstar Geographics'
            }
          },
          layers: [
            {
              id: 'satellite-layer',
              type: 'raster',
              source: 'satellite-tiles',
              minzoom: 0,
              maxzoom: 20
            }
          ]
        };

      case 'HYBRID':
        return {
          version: 8,
          sources: {
            'satellite-tiles': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              attribution: 'Esri, Maxar'
            },
            'labels': {
              type: 'raster',
              tiles: [
                'https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png'
              ],
              tileSize: 256
            }
          },
          layers: [
            {
              id: 'satellite-layer',
              type: 'raster',
              source: 'satellite-tiles'
            },
            {
              id: 'labels-layer',
              type: 'raster',
              source: 'labels'
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

      case 'STREETS':
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
      pitch: 45,
      bearing: -15,
    });

    mapRef.current = map;

    // Controls
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }),
      'top-right'
    );

    // Viewport tracker for God's Eye HUD
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
      pitch: 45,
      speed: 1.4,
      curve: 1.2,
      essential: true
    });
  }, [flyToLocation]);

  // Helper to determine dominant status for building
  const getBuildingStatusColor = (bldId: string) => {
    const bApartments = apartments.filter(a => a.buildingId === bldId && !a.archivedAt);
    if (bApartments.length === 0) return '#3b82f6'; // default blue

    const hasAccessProblem = bApartments.some(a => a.calculatedStatus === 'ACCESS_PROBLEM');
    if (hasAccessProblem) return '#ef4444'; // red

    const allContacted = bApartments.every(a => a.calculatedStatus === 'CONTACTED');
    if (allContacted) return '#10b981'; // emerald green

    const someContacted = bApartments.some(a => a.calculatedStatus === 'CONTACTED');
    if (someContacted) return '#22c55e'; // green

    const someNoAnswer = bApartments.some(a => a.calculatedStatus === 'NO_ANSWER');
    if (someNoAnswer) return '#f59e0b'; // amber

    return '#3b82f6'; // blue pending
  };

  // Re-render GeoJSON layers on the map
  const refreshGeoJsonLayers = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Remove existing custom sources/layers if present
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

      // 2. Zones Source & Layer
      const zonesGeoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: zones.map(z => ({
          type: 'Feature',
          id: z.id,
          properties: {
            id: z.id,
            name: z.name,
            code: z.code
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
          'fill-color': '#0f766e',
          'fill-opacity': 0.08
        }
      });

      map.addLayer({
        id: 'zones-line-layer',
        type: 'line',
        source: 'zones-src',
        paint: {
          'line-color': '#14b8a6',
          'line-width': 1.8
        }
      });
    }

    // 3. Buildings Source & Layer
    if (layers.buildings) {
      const buildingsGeoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: buildings.map(b => {
          const statusColor = layers.preachingStatus ? getBuildingStatusColor(b.id) : '#0284c7';
          const height = b.floors * 4.2; // approx 4.2 meters per floor

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
        // 3D Extrusion
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
        // 2D Footprint Fill
        map.addLayer({
          id: 'buildings-fill-layer',
          type: 'fill',
          source: 'buildings-src',
          paint: {
            'fill-color': ['get', 'statusColor'],
            'fill-opacity': 0.65
          }
        });
      }

      // Building Outline
      map.addLayer({
        id: 'buildings-line-layer',
        type: 'line',
        source: 'buildings-src',
        paint: {
          'line-color': '#ffffff',
          'line-width': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            3.5,
            1.5
          ]
        }
      });

      // Click building handler
      map.on('click', 'buildings-extrusion-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        const bId = e.features[0].properties?.id;
        const targetBuilding = buildings.find(b => b.id === bId);
        if (targetBuilding) onSelectBuilding(targetBuilding);
      });

      map.on('click', 'buildings-fill-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        const bId = e.features[0].properties?.id;
        const targetBuilding = buildings.find(b => b.id === bId);
        if (targetBuilding) onSelectBuilding(targetBuilding);
      });

      // Cursor pointer on hover
      const setPointer = () => { map.getCanvas().style.cursor = 'pointer'; };
      const resetPointer = () => { map.getCanvas().style.cursor = ''; };

      map.on('mouseenter', 'buildings-extrusion-layer', setPointer);
      map.on('mouseleave', 'buildings-extrusion-layer', resetPointer);
      map.on('mouseenter', 'buildings-fill-layer', setPointer);
      map.on('mouseleave', 'buildings-fill-layer', resetPointer);
    }
  };

  // Re-trigger layers when data or layers toggle changes
  useEffect(() => {
    refreshGeoJsonLayers();
  }, [layers, buildings, apartments, zones, territories, selectedBuilding]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
