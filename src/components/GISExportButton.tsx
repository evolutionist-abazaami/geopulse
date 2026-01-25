import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileJson, Map, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AnalysisFeature,
  exportAsGeoJSON,
  exportAsKML,
} from "@/lib/gis-export";

interface GISExportButtonProps {
  features: AnalysisFeature[];
  filename?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
}

export const GISExportButton = ({
  features,
  filename = "geopulse-export",
  variant = "outline",
  size = "sm",
  className = "",
  disabled = false,
}: GISExportButtonProps) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "geojson" | "kml") => {
    if (features.length === 0) {
      toast.error("No data to export");
      return;
    }

    setExporting(true);
    try {
      if (format === "geojson") {
        exportAsGeoJSON(features, filename);
        toast.success(`Exported ${features.length} feature(s) as GeoJSON`);
      } else {
        exportAsKML(features, filename);
        toast.success(`Exported ${features.length} feature(s) as KML`);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={disabled || exporting || features.length === 0}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export GIS
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("geojson")}>
          <FileJson className="h-4 w-4 mr-2" />
          GeoJSON (.geojson)
          <span className="ml-auto text-xs text-muted-foreground">QGIS</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("kml")}>
          <Map className="h-4 w-4 mr-2" />
          KML (.kml)
          <span className="ml-auto text-xs text-muted-foreground">Google Earth</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GISExportButton;
