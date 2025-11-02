import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Play, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

const GeoWitness = () => {
  const [eventType, setEventType] = useState("deforestation");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    toast.info("Starting satellite analysis...");

    // Simulate analysis
    setTimeout(() => {
      setResults({
        eventType,
        area: "1,245 km²",
        changePercent: 12.5,
        summary: `Deforestation increased by 12.5% in the Ashanti region between 2022-2024. Analysis indicates significant tree cover loss in the northern sectors.`
      });
      setIsAnalyzing(false);
      toast.success("Analysis complete!");
    }, 3000);
  };

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col bg-background">
      <div className="flex-1 flex overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer
            key="geowitness-map"
            center={[6.5, -1.5]}
            zoom={7}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </MapContainer>

          {/* Controls Overlay */}
          <div className="absolute top-6 left-6 z-[1000] space-y-4">
            <Card className="p-6 w-80 bg-card/95 backdrop-blur shadow-elevated">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Analysis Controls
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Event Type</label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deforestation">Deforestation</SelectItem>
                      <SelectItem value="flood">Flood</SelectItem>
                      <SelectItem value="fire">Fire</SelectItem>
                      <SelectItem value="urbanization">Urbanization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Region</label>
                  <Input placeholder="e.g., Ashanti Region, Ghana" defaultValue="Ashanti Region, Ghana" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Input type="date" defaultValue="2022-01-01" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Input type="date" defaultValue="2024-01-01" />
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-ocean hover:opacity-90"
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Analysis
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Results Panel */}
        {results && (
          <div className="w-96 bg-card border-l border-border p-6 overflow-y-auto animate-slide-in-right">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Analysis Results</h2>
                <Button variant="ghost" size="icon">
                  <Download className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-destructive">High Impact Change Detected</p>
                  <p className="text-sm text-muted-foreground mt-1">Immediate attention recommended</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Event Type</p>
                  <p className="font-semibold capitalize">{results.eventType}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Area Analyzed</p>
                  <p className="font-semibold">{results.area}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Change Detected</p>
                  <p className="text-3xl font-bold text-destructive">{results.changePercent}%</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Summary</p>
                  <p className="text-sm leading-relaxed">{results.summary}</p>
                </div>

                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report (PDF)
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeoWitness;
