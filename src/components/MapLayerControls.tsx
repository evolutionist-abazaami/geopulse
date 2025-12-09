import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Layers, Mountain, Thermometer, CloudRain, TreePine, X } from "lucide-react";
import { HeatmapLayerType } from "./MapLibreMap";

interface MapLayerControlsProps {
  is3DEnabled: boolean;
  onToggle3D: (enabled: boolean) => void;
  activeHeatmapLayer: HeatmapLayerType;
  onHeatmapLayerChange: (layer: HeatmapLayerType) => void;
}

const MapLayerControls = ({
  is3DEnabled,
  onToggle3D,
  activeHeatmapLayer,
  onHeatmapLayerChange,
}: MapLayerControlsProps) => {
  const heatmapLayers = [
    { value: "vegetation" as const, label: "Vegetation Density", icon: TreePine, color: "text-green-500" },
    { value: "temperature" as const, label: "Temperature", icon: Thermometer, color: "text-red-500" },
    { value: "rainfall" as const, label: "Rainfall", icon: CloudRain, color: "text-blue-500" },
    { value: "none" as const, label: "No Heatmap", icon: X, color: "text-muted-foreground" },
  ];

  const activeLayer = heatmapLayers.find(l => l.value === activeHeatmapLayer);

  return (
    <Card className="absolute top-4 left-4 z-10 p-2 bg-background/95 backdrop-blur-sm border-border/50 shadow-lg">
      <div className="flex items-center gap-2">
        {/* 3D Toggle */}
        <Button
          variant={is3DEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => onToggle3D(!is3DEnabled)}
          className="gap-2"
        >
          <Mountain className="h-4 w-4" />
          3D Terrain
        </Button>

        {/* Heatmap Layer Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Layers className="h-4 w-4" />
              {activeLayer?.label || "Layers"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {heatmapLayers.map(layer => {
              const Icon = layer.icon;
              return (
                <DropdownMenuItem
                  key={layer.value}
                  onClick={() => onHeatmapLayerChange(layer.value)}
                  className={`gap-2 ${activeHeatmapLayer === layer.value ? "bg-accent" : ""}`}
                >
                  <Icon className={`h-4 w-4 ${layer.color}`} />
                  {layer.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Legend for active layer */}
      {activeHeatmapLayer !== "none" && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground mb-1">{activeLayer?.label} Legend</div>
          <div className="flex items-center gap-1">
            <span className="text-xs">Low</span>
            <div 
              className="flex-1 h-2 rounded-full"
              style={{
                background: activeHeatmapLayer === "vegetation" 
                  ? "linear-gradient(to right, #f7fcb9, #addd8e, #31a354, #006837)"
                  : activeHeatmapLayer === "temperature"
                  ? "linear-gradient(to right, #ffffb2, #fecc5c, #fd8d3c, #e31a1c)"
                  : "linear-gradient(to right, #f1eef6, #bdc9e1, #74a9cf, #0570b0)",
              }}
            />
            <span className="text-xs">High</span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default MapLayerControls;
