import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

interface AnimatedMapTransitionProps {
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

const AnimatedMapTransition = ({
  center,
  zoom,
  className = "",
  period1Label,
  period2Label,
  period1Data,
  period2Data,
  selectedLocation,
}: AnimatedMapTransitionProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(50); // ms per frame
  const animationRef = useRef<number | null>(null);

  // Generate interpolated heatmap data based on transition progress
  const generateInterpolatedData = useCallback((
    progress: number,
    baseLat: number,
    baseLng: number
  ) => {
    const p1Change = period1Data?.changePercent || 0;
    const p2Change = period2Data?.changePercent || 0;
    
    // Interpolate between the two periods
    const currentChange = p1Change + (p2Change - p1Change) * (progress / 100);
    const intensity = Math.min(1, Math.abs(currentChange) / 100);
    
    const points: { lat: number; lng: number; intensity: number }[] = [];
    
    // Generate points with varying density based on progress
    const numPoints = 30 + Math.floor(progress / 5);
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = 0.1 + Math.random() * 0.4 * (1 + progress / 100);
      const latOffset = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.15;
      const lngOffset = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.15;
      
      // Intensity increases/decreases based on transition
      const pointIntensity = Math.max(0.1, intensity + (Math.random() - 0.5) * 0.3);
      
      points.push({
        lat: baseLat + latOffset,
        lng: baseLng + lngOffset,
        intensity: pointIntensity,
      });
    }
    return { points, currentChange };
  }, [period1Data, period2Data]);

  // Update heatmap layer with interpolated data
  const updateHeatmap = useCallback((progress: number) => {
    const map = mapInstance.current;
    if (!map || !mapLoaded || !selectedLocation) return;

    const { points, currentChange } = generateInterpolatedData(
      progress,
      selectedLocation.lat,
      selectedLocation.lng
    );

    const sourceId = "animated-heatmap";
    const layerId = "animated-heatmap-layer";

    // Dynamic colors based on severity
    const getColors = () => {
      if (currentChange > 50) {
        return ["#fee5d9", "#fcae91", "#fb6a4a", "#cb181d"]; // Red (severe)
      } else if (currentChange > 25) {
        return ["#fff7bc", "#fec44f", "#d95f0e", "#993404"]; // Orange (moderate)
      }
      return ["#f7fcb9", "#addd8e", "#31a354", "#006837"]; // Green (low)
    };

    const colors = getColors();

    try {
      // Update or create source
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: points.map(point => ({
            type: "Feature" as const,
            properties: { intensity: point.intensity },
            geometry: {
              type: "Point" as const,
              coordinates: [point.lng, point.lat],
            },
          })),
        });
      } else {
        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: points.map(point => ({
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
            "heatmap-intensity": 1.5,
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
            "heatmap-radius": 60,
            "heatmap-opacity": 0.8,
          },
        });
      }

      // Update layer paint properties for color changes
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "heatmap-color", [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.1, colors[0],
          0.3, colors[1],
          0.5, colors[2],
          0.7, colors[3],
          1, colors[3],
        ]);
      }
    } catch (error) {
      console.error("Error updating heatmap:", error);
    }
  }, [mapLoaded, selectedLocation, generateInterpolatedData]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let lastTime = 0;
    const animate = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const delta = timestamp - lastTime;

      if (delta >= playbackSpeed) {
        setTransitionProgress(prev => {
          const next = prev + 1;
          if (next >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return next;
        });
        lastTime = timestamp;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  // Update heatmap when progress changes
  useEffect(() => {
    updateHeatmap(transitionProgress);
  }, [transitionProgress, updateHeatmap]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
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
      center: [center[1], center[0]],
      zoom: zoom,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      setMapLoaded(true);
    });

    mapInstance.current = map;

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Update map center
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.jumpTo({
      center: [center[1], center[0]],
      zoom: zoom,
    });
  }, [center, zoom]);

  // Add marker for selected location
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || !selectedLocation) return;

    const existingMarkers = document.querySelectorAll('.animated-map-marker');
    existingMarkers.forEach(m => m.remove());

    const el = document.createElement("div");
    el.className = "animated-map-marker";
    el.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #0891b2, #0891b2dd);
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        animation: pulse 2s infinite;
      "></div>
    `;

    new maplibregl.Marker(el)
      .setLngLat([selectedLocation.lng, selectedLocation.lat])
      .addTo(mapInstance.current);
  }, [mapLoaded, selectedLocation]);

  const handlePlayPause = () => {
    if (transitionProgress >= 100) {
      setTransitionProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setTransitionProgress(0);
  };

  const handleSliderChange = (value: number[]) => {
    setIsPlaying(false);
    setTransitionProgress(value[0]);
  };

  const stepBackward = () => {
    setIsPlaying(false);
    setTransitionProgress(prev => Math.max(0, prev - 5));
  };

  const stepForward = () => {
    setIsPlaying(false);
    setTransitionProgress(prev => Math.min(100, prev + 5));
  };

  // Calculate current interpolated values
  const p1Change = period1Data?.changePercent || 0;
  const p2Change = period2Data?.changePercent || 0;
  const currentChange = p1Change + (p2Change - p1Change) * (transitionProgress / 100);

  const getCurrentPeriodLabel = () => {
    if (transitionProgress < 25) return period1Label;
    if (transitionProgress > 75) return period2Label;
    return "Transitioning...";
  };

  const getChangeColor = (percent: number) => {
    if (percent > 50) return "bg-destructive";
    if (percent > 25) return "bg-amber-500";
    return "bg-emerald-600";
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Map Container */}
      <div className="h-[400px] rounded-lg overflow-hidden border border-border shadow-lg">
        <div ref={mapRef} className="w-full h-full" />

        {/* Timeline Progress Indicator */}
        <div className="absolute top-3 left-3 right-3 z-10">
          <div className="flex justify-between items-center bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-md">
            <Badge variant="secondary" className="text-xs">
              {period1Label}
            </Badge>
            <div className="flex-1 mx-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-100 ease-linear"
                  style={{ width: `${transitionProgress}%` }}
                />
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {period2Label}
            </Badge>
          </div>
        </div>

        {/* Current Stats Overlay */}
        <div className="absolute bottom-20 left-3 z-10">
          <div className="bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-md space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={`${getChangeColor(currentChange)} text-white`}>
                {currentChange.toFixed(1)}% change
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {getCurrentPeriodLabel()}
            </p>
          </div>
        </div>

        {/* Location Badge */}
        {selectedLocation && (
          <div className="absolute bottom-20 right-3 z-10">
            <Badge variant="outline" className="bg-background/95 backdrop-blur-sm shadow-md px-3 py-1.5">
              {selectedLocation.name}
            </Badge>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="mt-4 bg-card rounded-lg border border-border p-4 space-y-4">
        {/* Progress Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Timeline Progress</span>
            <span className="font-medium">{transitionProgress}%</span>
          </div>
          <Slider
            value={[transitionProgress]}
            min={0}
            max={100}
            step={1}
            onValueChange={handleSliderChange}
            className="w-full"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={stepBackward} disabled={transitionProgress === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={handlePlayPause} className="h-12 w-12">
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
          <Button variant="outline" size="icon" onClick={stepForward} disabled={transitionProgress === 100}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-muted-foreground">Speed:</span>
          <div className="flex gap-1">
            {[
              { label: "0.5x", value: 100 },
              { label: "1x", value: 50 },
              { label: "2x", value: 25 },
            ].map(speed => (
              <Button
                key={speed.label}
                variant={playbackSpeed === speed.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPlaybackSpeed(speed.value)}
              >
                {speed.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      {!selectedLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
          <p className="text-muted-foreground text-sm">Select a location and run comparison to see the animation</p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedMapTransition;
