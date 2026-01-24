import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Badge } from "@/components/ui/badge";

interface SplitMapComparisonProps {
  center: [number, number];
  zoom: number;
  className?: string;
  period1Label: string;
  period2Label: string;
  period1Data?: {
    changePercent?: number;
    summary?: string;
  };
  period2Data?: {
    changePercent?: number;
    summary?: string;
  };
  selectedLocation?: { lat: number; lng: number; name: string } | null;
}

const SplitMapComparison = ({
  center,
  zoom,
  className = "",
  period1Label,
  period2Label,
  period1Data,
  period2Data,
  selectedLocation,
}: SplitMapComparisonProps) => {
  const leftMapRef = useRef<HTMLDivElement>(null);
  const rightMapRef = useRef<HTMLDivElement>(null);
  const leftMapInstance = useRef<maplibregl.Map | null>(null);
  const rightMapInstance = useRef<maplibregl.Map | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState({ left: false, right: false });
  const isSyncing = useRef(false);

  // Generate simulated heatmap data based on change percent
  const generateHeatmapData = useCallback((changePercent: number, baseLat: number, baseLng: number) => {
    const points: { lat: number; lng: number; intensity: number }[] = [];
    const intensity = Math.min(1, changePercent / 100);
    
    // Generate points around the selected location
    for (let i = 0; i < 20; i++) {
      const latOffset = (Math.random() - 0.5) * 0.5;
      const lngOffset = (Math.random() - 0.5) * 0.5;
      points.push({
        lat: baseLat + latOffset,
        lng: baseLng + lngOffset,
        intensity: Math.max(0.1, intensity + (Math.random() - 0.5) * 0.3),
      });
    }
    return points;
  }, []);

  // Add heatmap layer to map
  const addHeatmapToMap = useCallback((
    map: maplibregl.Map,
    data: { lat: number; lng: number; intensity: number }[],
    isPeriod1: boolean
  ) => {
    const sourceId = isPeriod1 ? "period1-heatmap" : "period2-heatmap";
    const layerId = isPeriod1 ? "period1-heatmap-layer" : "period2-heatmap-layer";
    
    // Remove existing layers
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    const colors = isPeriod1 
      ? ["#f7fcb9", "#addd8e", "#31a354", "#006837"]
      : ["#fee5d9", "#fcae91", "#fb6a4a", "#cb181d"];

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: data.map(point => ({
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
      id: layerId,
      type: "heatmap",
      source: sourceId,
      paint: {
        "heatmap-weight": ["get", "intensity"],
        "heatmap-intensity": 1.2,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.1, colors[0],
          0.3, colors[1],
          0.5, colors[2],
          0.7, colors[3],
          1, colors[3],
        ],
        "heatmap-radius": 50,
        "heatmap-opacity": 0.7,
      },
    });
  }, []);

  // Sync function to synchronize map movements
  const syncMaps = useCallback((sourceMap: maplibregl.Map, targetMap: maplibregl.Map) => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    const center = sourceMap.getCenter();
    const zoom = sourceMap.getZoom();
    const bearing = sourceMap.getBearing();
    const pitch = sourceMap.getPitch();

    targetMap.jumpTo({
      center,
      zoom,
      bearing,
      pitch,
    });

    setTimeout(() => {
      isSyncing.current = false;
    }, 10);
  }, []);

  // Initialize both maps
  useEffect(() => {
    if (!leftMapRef.current || !rightMapRef.current) return;
    if (leftMapInstance.current || rightMapInstance.current) return;

    const mapConfig = {
      style: {
        version: 8 as const,
        sources: {
          osm: {
            type: "raster" as const,
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap',
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster" as const,
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [center[1], center[0]] as [number, number],
      zoom: zoom,
      pitch: 0,
      bearing: 0,
    };

    // Initialize left map
    const leftMap = new maplibregl.Map({
      container: leftMapRef.current,
      ...mapConfig,
    });

    leftMap.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");

    // Initialize right map
    const rightMap = new maplibregl.Map({
      container: rightMapRef.current,
      ...mapConfig,
    });

    rightMap.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    // Set up synchronization
    leftMap.on("move", () => syncMaps(leftMap, rightMap));
    rightMap.on("move", () => syncMaps(rightMap, leftMap));

    leftMap.on("load", () => {
      setMapsLoaded(prev => ({ ...prev, left: true }));
    });

    rightMap.on("load", () => {
      setMapsLoaded(prev => ({ ...prev, right: true }));
    });

    leftMapInstance.current = leftMap;
    rightMapInstance.current = rightMap;

    return () => {
      leftMapInstance.current?.remove();
      rightMapInstance.current?.remove();
      leftMapInstance.current = null;
      rightMapInstance.current = null;
      setMapsLoaded({ left: false, right: false });
    };
  }, []);

  // Update map centers when center prop changes
  useEffect(() => {
    if (!leftMapInstance.current || !rightMapInstance.current) return;

    leftMapInstance.current.jumpTo({
      center: [center[1], center[0]],
      zoom: zoom,
    });
  }, [center, zoom]);

  // Add markers and heatmaps when data is available
  useEffect(() => {
    const leftMap = leftMapInstance.current;
    const rightMap = rightMapInstance.current;

    if (!leftMap || !rightMap || !mapsLoaded.left || !mapsLoaded.right) return;
    if (!selectedLocation) return;

    // Add markers to both maps
    const markerConfig = {
      color: "#0891b2",
    };

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.split-map-marker');
    existingMarkers.forEach(m => m.remove());

    [leftMap, rightMap].forEach(map => {
      const el = document.createElement("div");
      el.className = "split-map-marker";
      el.innerHTML = `
        <div style="
          background: linear-gradient(135deg, ${markerConfig.color}, ${markerConfig.color}dd);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          animation: pulse 2s infinite;
        "></div>
      `;

      new maplibregl.Marker(el)
        .setLngLat([selectedLocation.lng, selectedLocation.lat])
        .addTo(map);
    });

    // Add heatmaps if data exists
    if (period1Data?.changePercent !== undefined) {
      const period1Heatmap = generateHeatmapData(
        period1Data.changePercent,
        selectedLocation.lat,
        selectedLocation.lng
      );
      addHeatmapToMap(leftMap, period1Heatmap, true);
    }

    if (period2Data?.changePercent !== undefined) {
      const period2Heatmap = generateHeatmapData(
        period2Data.changePercent,
        selectedLocation.lat,
        selectedLocation.lng
      );
      addHeatmapToMap(rightMap, period2Heatmap, false);
    }
  }, [mapsLoaded, selectedLocation, period1Data, period2Data, generateHeatmapData, addHeatmapToMap]);

  const getChangeColor = (percent?: number) => {
    if (percent === undefined) return "bg-muted";
    if (percent > 50) return "bg-destructive";
    if (percent > 25) return "bg-warning";
    return "bg-emerald-600";
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Split container */}
      <div className="flex h-[400px] rounded-lg overflow-hidden border border-border shadow-lg">
        {/* Left map - Period 1 */}
        <div className="relative flex-1 border-r border-border/50">
          <div ref={leftMapRef} className="w-full h-full" />
          {/* Period 1 Label */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-md px-3 py-1.5">
              <span className="font-semibold text-primary">{period1Label}</span>
            </Badge>
            {period1Data?.changePercent !== undefined && (
              <Badge className={`${getChangeColor(period1Data.changePercent)} text-white shadow-md`}>
                {period1Data.changePercent.toFixed(1)}% change
              </Badge>
            )}
          </div>
        </div>

        {/* Divider with sync indicator */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="bg-background border-2 border-primary rounded-full p-2 shadow-lg">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        </div>

        {/* Right map - Period 2 */}
        <div className="relative flex-1">
          <div ref={rightMapRef} className="w-full h-full" />
          {/* Period 2 Label */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-md px-3 py-1.5">
              <span className="font-semibold text-secondary">{period2Label}</span>
            </Badge>
            {period2Data?.changePercent !== undefined && (
              <Badge className={`${getChangeColor(period2Data.changePercent)} text-white shadow-md`}>
                {period2Data.changePercent.toFixed(1)}% change
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Location indicator */}
      {selectedLocation && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <Badge variant="outline" className="bg-background/95 backdrop-blur-sm shadow-md px-4 py-2">
            <span className="text-sm font-medium">{selectedLocation.name}</span>
          </Badge>
        </div>
      )}

      {/* Instructions */}
      {!selectedLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
          <p className="text-muted-foreground text-sm">Select a location and run comparison to see side-by-side maps</p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default SplitMapComparison;
