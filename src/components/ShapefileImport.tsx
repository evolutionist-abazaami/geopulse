import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileUp, MapPin, Loader2, CheckCircle2, AlertCircle, X, FileType } from "lucide-react";
import { toast } from "sonner";
import { parseShapefile, readFileAsArrayBuffer, ShapefileImportResult } from "@/lib/shapefile-utils";
import { AnalysisFeature } from "@/lib/gis-export";

interface ShapefileImportProps {
  onImport: (features: AnalysisFeature[], bounds: ShapefileImportResult['bounds']) => void;
}

const ShapefileImport = ({ onImport }: ShapefileImportProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ShapefileImportResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => 
      f.name.endsWith('.shp') || 
      f.name.endsWith('.dbf') || 
      f.name.endsWith('.shx') ||
      f.name.endsWith('.prj') ||
      f.name.endsWith('.geojson') ||
      f.name.endsWith('.json')
    );
    
    if (validFiles.length === 0) {
      toast.error("Please select valid GIS files (.shp, .dbf, .geojson)");
      return;
    }
    
    setSelectedFiles(validFiles);
    setImportResult(null);
  };

  const processFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setProgress(10);

    try {
      // Check for GeoJSON first
      const geoJsonFile = selectedFiles.find(f => f.name.endsWith('.geojson') || f.name.endsWith('.json'));
      
      if (geoJsonFile) {
        setProgress(30);
        const text = await geoJsonFile.text();
        const geoJSON = JSON.parse(text);
        
        setProgress(60);
        const features: AnalysisFeature[] = [];
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        
        const geoFeatures = geoJSON.features || [geoJSON];
        
        geoFeatures.forEach((feature: any, index: number) => {
          if (feature.geometry) {
            let lat = 0, lng = 0;
            
            if (feature.geometry.type === 'Point') {
              lng = feature.geometry.coordinates[0];
              lat = feature.geometry.coordinates[1];
            } else if (feature.geometry.coordinates) {
              // Get centroid for polygons/lines
              const flatCoords = JSON.stringify(feature.geometry.coordinates);
              const numbers = flatCoords.match(/-?\d+\.?\d*/g)?.map(Number) || [];
              if (numbers.length >= 2) {
                const lngs = numbers.filter((_, i) => i % 2 === 0);
                const lats = numbers.filter((_, i) => i % 2 === 1);
                lng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
                lat = lats.reduce((a, b) => a + b, 0) / lats.length;
              }
            }

            if (lat && lng) {
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
              minLng = Math.min(minLng, lng);
              maxLng = Math.max(maxLng, lng);

              const props = feature.properties || {};
              features.push({
                id: `geo_${index}_${Date.now()}`,
                name: props.name || props.NAME || `Feature ${index + 1}`,
                coordinates: { lat, lng },
                eventType: props.event_type || props.type || 'environmental_change',
                changePercent: props.change_percent,
                startDate: props.start_date || new Date().toISOString().split('T')[0],
                endDate: props.end_date || new Date().toISOString().split('T')[0],
                summary: props.summary || props.description,
                areaAnalyzed: props.area,
                createdAt: new Date().toISOString(),
              });
            }
          }
        });

        setProgress(100);
        const result: ShapefileImportResult = {
          features,
          properties: geoFeatures.map((f: any) => f.properties || {}),
          bounds: { minLat, maxLat, minLng, maxLng },
        };
        
        setImportResult(result);
        toast.success(`Imported ${features.length} features from GeoJSON`);
      } else {
        // Process Shapefile
        const shpFile = selectedFiles.find(f => f.name.endsWith('.shp'));
        const dbfFile = selectedFiles.find(f => f.name.endsWith('.dbf'));
        
        if (!shpFile) {
          throw new Error("No .shp file found");
        }

        setProgress(30);
        const shpBuffer = await readFileAsArrayBuffer(shpFile);
        
        setProgress(50);
        let dbfBuffer: ArrayBuffer | undefined;
        if (dbfFile) {
          dbfBuffer = await readFileAsArrayBuffer(dbfFile);
        }

        setProgress(70);
        const result = await parseShapefile(shpBuffer, dbfBuffer);
        
        setProgress(100);
        setImportResult(result);
        toast.success(`Imported ${result.features.length} features from Shapefile`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmImport = () => {
    if (importResult) {
      onImport(importResult.features, importResult.bounds);
      toast.success("Features loaded to map");
      setSelectedFiles([]);
      setImportResult(null);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileType className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Import GIS Data</h3>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".shp,.dbf,.shx,.prj,.geojson,.json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {selectedFiles.length === 0 ? (
        <Button
          variant="outline"
          className="w-full h-24 border-dashed flex flex-col gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp className="h-6 w-6" />
          <span className="text-sm">Select Shapefile or GeoJSON</span>
          <span className="text-xs text-muted-foreground">.shp, .dbf, .geojson supported</span>
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileType className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate">{file.name}</span>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {(file.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Processing... {progress}%
              </p>
            </div>
          )}

          {importResult && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium text-sm">Import Preview</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Features:</span>{" "}
                  <span className="font-medium">{importResult.features.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Types:</span>{" "}
                  <span className="font-medium">
                    {[...new Set(importResult.features.map(f => f.eventType))].length}
                  </span>
                </div>
              </div>
              {importResult.features.slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
              {importResult.features.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{importResult.features.length - 3} more features
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {!importResult ? (
              <Button 
                onClick={processFiles} 
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4 mr-2" />
                    Process Files
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setImportResult(null)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={confirmImport} className="flex-1">
                  <MapPin className="h-4 w-4 mr-2" />
                  Load to Map
                </Button>
              </>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            + Add more files
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ShapefileImport;
