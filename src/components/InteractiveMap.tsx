import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface InteractiveMapProps {
  center: [number, number];
  zoom: number;
  className?: string;
  markers?: MapMarker[];
  polygons?: MapPolygon[];
  heatmapData?: { lat: number; lng: number; intensity: number }[];
}

const InteractiveMap = ({
  center,
  zoom,
  className = "",
  markers = [],
  polygons = [],
  heatmapData = [],
}: InteractiveMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize the map if it doesn't exist
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
      });

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map view when center or zoom changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update markers, polygons, and heatmap
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing layers
    layersRef.current.forEach(layer => {
      mapInstanceRef.current?.removeLayer(layer);
    });
    layersRef.current = [];

    // Add markers
    markers.forEach(marker => {
      const markerColor = marker.color || "#0891b2";
      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background-color: ${markerColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const markerLayer = L.marker([marker.lat, marker.lng], { icon })
        .bindPopup(`<strong>${marker.label}</strong>`)
        .addTo(mapInstanceRef.current!);

      layersRef.current.push(markerLayer);
    });

    // Add polygons
    polygons.forEach(polygon => {
      const polygonLayer = L.polygon(polygon.coordinates, {
        color: polygon.color || "#0891b2",
        fillColor: polygon.color || "#0891b2",
        fillOpacity: polygon.fillOpacity || 0.3,
        weight: 2,
      })
        .bindPopup(`<strong>${polygon.label}</strong>`)
        .addTo(mapInstanceRef.current!);

      layersRef.current.push(polygonLayer);
    });

    // Add heatmap representation (using circles)
    heatmapData.forEach(point => {
      const radius = point.intensity * 5000; // Scale intensity to meters
      const opacity = Math.min(point.intensity, 0.7);
      
      const circle = L.circle([point.lat, point.lng], {
        radius,
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: opacity,
        weight: 1,
      }).addTo(mapInstanceRef.current!);

      layersRef.current.push(circle);
    });

    // Fit bounds if there are markers or polygons
    if (markers.length > 0 || polygons.length > 0) {
      const bounds = L.latLngBounds([]);
      
      markers.forEach(m => bounds.extend([m.lat, m.lng]));
      polygons.forEach(p => p.coordinates.forEach(coord => bounds.extend(coord)));
      
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [markers, polygons, heatmapData]);

  return <div ref={mapRef} className={className} style={{ height: "100%", width: "100%" }} />;
};

export default InteractiveMap;
