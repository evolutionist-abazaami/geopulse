import { useEffect, useRef, useCallback } from "react";
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
  onLocationSelect?: (location: { lat: number; lng: number; name: string }) => void;
  selectionMode?: boolean;
  selectedArea?: { lat: number; lng: number; radius?: number } | null;
}

const InteractiveMap = ({
  center,
  zoom,
  className = "",
  markers = [],
  polygons = [],
  heatmapData = [],
  onLocationSelect,
  selectionMode = false,
  selectedArea = null,
}: InteractiveMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const selectionLayerRef = useRef<L.Layer | null>(null);

  // Reverse geocode to get location name
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
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
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize the map if it doesn't exist
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
      });

      // Add tile layer with better styling
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
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

  // Handle click events for location selection
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const handleMapClick = async (e: L.LeafletMouseEvent) => {
      if (!selectionMode || !onLocationSelect) return;

      const { lat, lng } = e.latlng;
      
      // Remove previous selection
      if (selectionLayerRef.current) {
        mapInstanceRef.current?.removeLayer(selectionLayerRef.current);
      }

      // Add selection marker with pulse effect
      const pulseIcon = L.divIcon({
        className: "selection-marker",
        html: `
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
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const selectionMarker = L.marker([lat, lng], { icon: pulseIcon })
        .addTo(mapInstanceRef.current!);

      // Add selection circle
      const selectionCircle = L.circle([lat, lng], {
        radius: 5000,
        color: "#0891b2",
        fillColor: "#0891b2",
        fillOpacity: 0.1,
        weight: 2,
        dashArray: "5, 5",
      }).addTo(mapInstanceRef.current!);

      selectionLayerRef.current = L.layerGroup([selectionMarker, selectionCircle]);
      selectionLayerRef.current.addTo(mapInstanceRef.current!);

      // Get location name via reverse geocoding
      const locationName = await reverseGeocode(lat, lng);
      
      onLocationSelect({ lat, lng, name: locationName });
    };

    if (selectionMode) {
      mapInstanceRef.current.on("click", handleMapClick);
      mapInstanceRef.current.getContainer().style.cursor = "crosshair";
    } else {
      mapInstanceRef.current.off("click", handleMapClick);
      mapInstanceRef.current.getContainer().style.cursor = "";
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off("click", handleMapClick);
      }
    };
  }, [selectionMode, onLocationSelect, reverseGeocode]);

  // Update selected area visualization
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (selectionLayerRef.current) {
      mapInstanceRef.current.removeLayer(selectionLayerRef.current);
      selectionLayerRef.current = null;
    }

    if (selectedArea) {
      const pulseIcon = L.divIcon({
        className: "selection-marker",
        html: `
          <div style="position: relative;">
            <div style="
              position: absolute;
              width: 40px;
              height: 40px;
              background: rgba(8, 145, 178, 0.3);
              border-radius: 50%;
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
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([selectedArea.lat, selectedArea.lng], { icon: pulseIcon });
      const circle = L.circle([selectedArea.lat, selectedArea.lng], {
        radius: selectedArea.radius || 5000,
        color: "#0891b2",
        fillColor: "#0891b2",
        fillOpacity: 0.1,
        weight: 2,
        dashArray: "5, 5",
      });

      selectionLayerRef.current = L.layerGroup([marker, circle]);
      selectionLayerRef.current.addTo(mapInstanceRef.current);
    }
  }, [selectedArea]);

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

    // Add markers with improved styling
    markers.forEach(marker => {
      const markerColor = marker.color || "#0891b2";
      const icon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            background: linear-gradient(135deg, ${markerColor}, ${markerColor}dd);
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
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const markerLayer = L.marker([marker.lat, marker.lng], { icon })
        .bindPopup(`
          <div style="padding: 8px;">
            <strong style="font-size: 14px;">${marker.label}</strong>
            <p style="margin: 4px 0 0; font-size: 12px; color: #666;">
              ${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}
            </p>
          </div>
        `)
        .addTo(mapInstanceRef.current!);

      layersRef.current.push(markerLayer);
    });

    // Add polygons with improved styling
    polygons.forEach(polygon => {
      const polygonLayer = L.polygon(polygon.coordinates, {
        color: polygon.color || "#0891b2",
        fillColor: polygon.color || "#0891b2",
        fillOpacity: polygon.fillOpacity || 0.2,
        weight: 3,
      })
        .bindPopup(`
          <div style="padding: 8px;">
            <strong style="font-size: 14px;">${polygon.label}</strong>
          </div>
        `)
        .addTo(mapInstanceRef.current!);

      layersRef.current.push(polygonLayer);
    });

    // Add heatmap representation (using circles with gradient)
    heatmapData.forEach(point => {
      const radius = Math.max(point.intensity * 8000, 2000);
      const opacity = Math.min(point.intensity * 0.8, 0.6);
      const color = point.intensity > 0.6 ? "#ef4444" : point.intensity > 0.3 ? "#f97316" : "#eab308";
      
      const circle = L.circle([point.lat, point.lng], {
        radius,
        color: color,
        fillColor: color,
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
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [markers, polygons, heatmapData]);

  return (
    <div ref={mapRef} className={className} style={{ height: "100%", width: "100%" }}>
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

export default InteractiveMap;
