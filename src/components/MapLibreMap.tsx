import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  color?: string;
}

interface MapPolygon {
  coordinates: [number, number][];
  label: string;
  color?: string;
  fillOpacity?: number;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export type HeatmapLayerType = "vegetation" | "temperature" | "rainfall" | "none";

interface MapLibreMapProps {
  center: [number, number];
  zoom: number;
  className?: string;
  markers?: MapMarker[];
  polygons?: MapPolygon[];
  heatmapData?: HeatmapPoint[];
  onLocationSelect?: (location: { lat: number; lng: number; name: string }) => void;
  selectionMode?: boolean;
  selectedArea?: { lat: number; lng: number; radius?: number } | null;
  is3DEnabled?: boolean;
  activeHeatmapLayer?: HeatmapLayerType;
}

const MapLibreMap = ({
  center,
  zoom,
  className = "",
  markers = [],
  polygons = [],
  heatmapData = [],
  onLocationSelect,
  selectionMode = false,
  selectedArea = null,
  is3DEnabled = false,
  activeHeatmapLayer = "none",
}: MapLibreMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Generate simulated environmental data for Africa
  const generateEnvironmentalData = (type: HeatmapLayerType): HeatmapPoint[] => {
    if (type === "none") return [];
    
    const africaPoints: HeatmapPoint[] = [];
    
    // Generate data points across Africa
    const regions = [
      // West Africa - high vegetation
      { lat: 6.5, lng: -1.5, baseIntensity: { vegetation: 0.85, temperature: 0.6, rainfall: 0.75 } },
      { lat: 7.5, lng: 4.0, baseIntensity: { vegetation: 0.75, temperature: 0.65, rainfall: 0.7 } },
      { lat: 10.0, lng: -8.0, baseIntensity: { vegetation: 0.6, temperature: 0.7, rainfall: 0.55 } },
      // Central Africa - rainforest
      { lat: 0.5, lng: 18.0, baseIntensity: { vegetation: 0.95, temperature: 0.55, rainfall: 0.9 } },
      { lat: -4.0, lng: 15.0, baseIntensity: { vegetation: 0.9, temperature: 0.5, rainfall: 0.85 } },
      // East Africa
      { lat: -1.3, lng: 36.8, baseIntensity: { vegetation: 0.5, temperature: 0.65, rainfall: 0.45 } },
      { lat: 9.0, lng: 38.7, baseIntensity: { vegetation: 0.35, temperature: 0.75, rainfall: 0.3 } },
      // Southern Africa
      { lat: -26.0, lng: 28.0, baseIntensity: { vegetation: 0.45, temperature: 0.55, rainfall: 0.4 } },
      { lat: -19.0, lng: 25.0, baseIntensity: { vegetation: 0.3, temperature: 0.8, rainfall: 0.2 } },
      // North Africa - Sahara
      { lat: 25.0, lng: 10.0, baseIntensity: { vegetation: 0.05, temperature: 0.95, rainfall: 0.05 } },
      { lat: 28.0, lng: 3.0, baseIntensity: { vegetation: 0.08, temperature: 0.9, rainfall: 0.08 } },
      { lat: 22.0, lng: 25.0, baseIntensity: { vegetation: 0.03, temperature: 0.92, rainfall: 0.03 } },
    ];

    regions.forEach(region => {
      // Add main point
      africaPoints.push({
        lat: region.lat,
        lng: region.lng,
        intensity: region.baseIntensity[type],
      });
      
      // Add surrounding points with slight variation
      for (let i = 0; i < 4; i++) {
        const latOffset = (Math.random() - 0.5) * 4;
        const lngOffset = (Math.random() - 0.5) * 4;
        const intensityVariation = (Math.random() - 0.5) * 0.2;
        
        africaPoints.push({
          lat: region.lat + latOffset,
          lng: region.lng + lngOffset,
          intensity: Math.max(0, Math.min(1, region.baseIntensity[type] + intensityVariation)),
        });
      }
    });

    return africaPoints;
  };

  // Reverse geocode to get location name
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "GeoPulse Environmental Analysis App",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.display_name?.split(",").slice(0, 3).join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    } catch (error) {
      console.error("Reverse geocode error:", error);
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
          terrainSource: {
            type: "raster-dem",
            tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
            encoding: "terrarium",
            tileSize: 256,
          },
          hillshadeSource: {
            type: "raster-dem",
            tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
            encoding: "terrarium",
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
          {
            id: "hillshade",
            type: "hillshade",
            source: "hillshadeSource",
            paint: {
              "hillshade-shadow-color": "#473B24",
              "hillshade-illumination-anchor": "viewport",
              "hillshade-exaggeration": 0.5,
            },
          },
        ],
        terrain: {
          source: "terrainSource",
          exaggeration: 1.5,
        },
      },
      center: [center[1], center[0]], // MapLibre uses [lng, lat]
      zoom: zoom,
      pitch: is3DEnabled ? 60 : 0,
      bearing: is3DEnabled ? -17 : 0,
      maxPitch: 85,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl(), "bottom-left");

    map.on("load", () => {
      setMapLoaded(true);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle 3D mode toggle
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.easeTo({
      pitch: is3DEnabled ? 60 : 0,
      bearing: is3DEnabled ? -17 : 0,
      duration: 1000,
    });
  }, [is3DEnabled]);

  // Update center and zoom
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.easeTo({
      center: [center[1], center[0]],
      zoom: zoom,
      duration: 500,
    });
  }, [center, zoom]);

  // Handle selection mode clicks
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const handleClick = async (e: maplibregl.MapMouseEvent) => {
      if (!selectionMode || !onLocationSelect) return;

      const { lng, lat } = e.lngLat;
      const locationName = await reverseGeocode(lat, lng);
      onLocationSelect({ lat, lng, name: locationName });
    };

    if (selectionMode) {
      mapInstanceRef.current.on("click", handleClick);
      mapInstanceRef.current.getCanvas().style.cursor = "crosshair";
    } else {
      mapInstanceRef.current.off("click", handleClick);
      mapInstanceRef.current.getCanvas().style.cursor = "";
    }

    return () => {
      mapInstanceRef.current?.off("click", handleClick);
    };
  }, [selectionMode, onLocationSelect]);

  // Update heatmap layer
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const map = mapInstanceRef.current;

    // Remove existing heatmap layer
    if (map.getLayer("heatmap-layer")) {
      map.removeLayer("heatmap-layer");
    }
    if (map.getSource("heatmap-source")) {
      map.removeSource("heatmap-source");
    }

    if (activeHeatmapLayer === "none") return;

    const environmentalData = generateEnvironmentalData(activeHeatmapLayer);
    
    // Color schemes for different layers
    const colorSchemes = {
      vegetation: ["#f7fcb9", "#addd8e", "#31a354", "#006837"],
      temperature: ["#ffffb2", "#fecc5c", "#fd8d3c", "#e31a1c"],
      rainfall: ["#f1eef6", "#bdc9e1", "#74a9cf", "#0570b0"],
    };

    const colors = colorSchemes[activeHeatmapLayer];

    // Add heatmap source and layer
    map.addSource("heatmap-source", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: environmentalData.map(point => ({
          type: "Feature" as const,
          properties: { intensity: point.intensity },
          geometry: {
            type: "Point" as const,
            coordinates: [point.lng, point.lat],
          },
        })),
      },
    });

    map.addLayer({
      id: "heatmap-layer",
      type: "heatmap",
      source: "heatmap-source",
      paint: {
        "heatmap-weight": ["get", "intensity"],
        "heatmap-intensity": 1,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.2, colors[0],
          0.4, colors[1],
          0.6, colors[2],
          1, colors[3],
        ],
        "heatmap-radius": 50,
        "heatmap-opacity": 0.7,
      },
    });
  }, [activeHeatmapLayer, mapLoaded]);

  // Update markers
  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!mapInstanceRef.current) return;

    // Add new markers
    markers.forEach(marker => {
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.innerHTML = `
        <div style="
          background: linear-gradient(135deg, ${marker.color || "#0891b2"}, ${marker.color || "#0891b2"}dd);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <strong style="font-size: 14px;">${marker.label}</strong>
          <p style="margin: 4px 0 0; font-size: 12px; color: #666;">
            ${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}
          </p>
        </div>
      `);

      const mapMarker = new maplibregl.Marker(el)
        .setLngLat([marker.lng, marker.lat])
        .setPopup(popup)
        .addTo(mapInstanceRef.current!);

      markersRef.current.push(mapMarker);
    });

    // Fit bounds if markers exist
    if (markers.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      markers.forEach(m => bounds.extend([m.lng, m.lat]));
      mapInstanceRef.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [markers]);

  // Update selected area visualization
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const map = mapInstanceRef.current;

    // Remove existing selection layer
    if (map.getLayer("selection-circle")) {
      map.removeLayer("selection-circle");
    }
    if (map.getSource("selection-source")) {
      map.removeSource("selection-source");
    }

    if (!selectedArea) return;

    // Create circle geometry
    const radius = (selectedArea.radius || 5000) / 1000; // Convert to km
    const points = 64;
    const coords: [number, number][] = [];
    
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radius * Math.cos(angle) / 111; // Approximate degrees
      const dy = radius * Math.sin(angle) / (111 * Math.cos(selectedArea.lat * Math.PI / 180));
      coords.push([selectedArea.lng + dy, selectedArea.lat + dx]);
    }
    coords.push(coords[0]); // Close the circle

    map.addSource("selection-source", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [coords],
        },
      },
    });

    map.addLayer({
      id: "selection-circle",
      type: "fill",
      source: "selection-source",
      paint: {
        "fill-color": "#0891b2",
        "fill-opacity": 0.15,
      },
    });

    // Add center marker
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position: relative;">
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          background: rgba(8, 145, 178, 0.3);
          border-radius: 50%;
          animation: pulse 1.5s ease-out infinite;
          left: -8px;
          top: -8px;
        "></div>
        <div style="
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #0891b2, #0e7490);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        "></div>
      </div>
    `;

    const selectionMarker = new maplibregl.Marker(el)
      .setLngLat([selectedArea.lng, selectedArea.lat])
      .addTo(map);

    markersRef.current.push(selectionMarker);
  }, [selectedArea, mapLoaded]);

  // Update polygons
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const map = mapInstanceRef.current;

    // Remove existing polygon layers
    polygons.forEach((_, index) => {
      if (map.getLayer(`polygon-${index}`)) {
        map.removeLayer(`polygon-${index}`);
      }
      if (map.getLayer(`polygon-outline-${index}`)) {
        map.removeLayer(`polygon-outline-${index}`);
      }
      if (map.getSource(`polygon-source-${index}`)) {
        map.removeSource(`polygon-source-${index}`);
      }
    });

    // Add new polygons
    polygons.forEach((polygon, index) => {
      const coordinates = polygon.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);
      
      map.addSource(`polygon-source-${index}`, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { label: polygon.label },
          geometry: {
            type: "Polygon",
            coordinates: [coordinates],
          },
        },
      });

      map.addLayer({
        id: `polygon-${index}`,
        type: "fill",
        source: `polygon-source-${index}`,
        paint: {
          "fill-color": polygon.color || "#0891b2",
          "fill-opacity": polygon.fillOpacity || 0.2,
        },
      });

      map.addLayer({
        id: `polygon-outline-${index}`,
        type: "line",
        source: `polygon-source-${index}`,
        paint: {
          "line-color": polygon.color || "#0891b2",
          "line-width": 3,
        },
      });
    });
  }, [polygons, mapLoaded]);

  return (
    <div className={`relative ${className}`} style={{ height: "100%", width: "100%" }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default MapLibreMap;
