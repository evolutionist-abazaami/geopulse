import { useState } from "react";
import InteractiveMap from "@/components/InteractiveMap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Play, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const africanRegions = [
  "Ashanti Region, Ghana", "Lagos, Nigeria", "Nairobi, Kenya", "Cairo, Egypt",
  "Cape Town, South Africa", "Addis Ababa, Ethiopia", "Dar es Salaam, Tanzania",
  "Abidjan, Côte d'Ivoire", "Kampala, Uganda", "Accra, Ghana", "Kigali, Rwanda",
  "Dakar, Senegal", "Mogadishu, Somalia", "Luanda, Angola", "Maputo, Mozambique",
  "Harare, Zimbabwe", "Lusaka, Zambia", "Kinshasa, DRC", "Bamako, Mali",
  "Ouagadougou, Burkina Faso", "Niamey, Niger", "N'Djamena, Chad",
  "Khartoum, Sudan", "Tunis, Tunisia", "Algiers, Algeria", "Rabat, Morocco",
  "Tripoli, Libya", "Windhoek, Namibia", "Gaborone, Botswana", "Maseru, Lesotho"
];

const eventTypes = [
  { value: "deforestation", label: "Deforestation", icon: "🌳" },
  { value: "flood", label: "Flood", icon: "🌊" },
  { value: "drought", label: "Drought", icon: "🏜️" },
  { value: "fire", label: "Wildfire", icon: "🔥" },
  { value: "urbanization", label: "Urbanization", icon: "🏙️" },
  { value: "climate_change", label: "Climate Change", icon: "🌡️" },
  { value: "desertification", label: "Desertification", icon: "🏜️" },
  { value: "coastal_erosion", label: "Coastal Erosion", icon: "🏖️" },
  { value: "agriculture", label: "Agricultural Change", icon: "🌾" },
];

const GeoWitness = () => {
  const [eventType, setEventType] = useState("deforestation");
  const [region, setRegion] = useState("Ashanti Region, Ghana");
  const [startDate, setStartDate] = useState("2022-01-01");
  const [endDate, setEndDate] = useState("2024-01-01");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([6.5, -1.5]);
  const [mapZoom, setMapZoom] = useState(7);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [mapPolygons, setMapPolygons] = useState<any[]>([]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setResults(null);
    toast.info("Starting AI-powered satellite analysis...");

    try {
      const coordinates = { lat: 6.5, lng: -1.5 }; // Default Ghana coordinates
      
      // Get current session for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-satellite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            eventType,
            region,
            startDate,
            endDate,
            coordinates,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
      
      // Update map visualization
      if (coordinates) {
        setMapCenter([coordinates.lat, coordinates.lng]);
        setMapZoom(10);
        
        // Add marker for analyzed location
        setMapMarkers([{
          lat: coordinates.lat,
          lng: coordinates.lng,
          label: `${region} - ${eventType}`,
          color: "#ef4444"
        }]);
        
        // Create polygon to show affected area (example boundary)
        const boundarySize = 0.1;
        setMapPolygons([{
          coordinates: [
            [coordinates.lat + boundarySize, coordinates.lng - boundarySize],
            [coordinates.lat + boundarySize, coordinates.lng + boundarySize],
            [coordinates.lat - boundarySize, coordinates.lng + boundarySize],
            [coordinates.lat - boundarySize, coordinates.lng - boundarySize],
          ] as [number, number][],
          label: `${data.changePercent}% ${eventType} detected`,
          color: data.changePercent > 50 ? "#ef4444" : "#f97316",
          fillOpacity: 0.2
        }]);
      }
      
      if (session) {
        toast.success("Analysis complete and saved to your history!");
      } else {
        toast.success("Analysis complete! Sign in to save your history.");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to complete analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col bg-background">
      <div className="flex-1 flex overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative">
          <InteractiveMap 
            center={mapCenter} 
            zoom={mapZoom} 
            className="h-full w-full"
            markers={mapMarkers}
            polygons={mapPolygons}
          />

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
                      {eventTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Region</label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {africanRegions.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-ocean hover:opacity-90"
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run AI Analysis
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  Powered by Google Earth Engine & AI
                </p>
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

                {results.fullAnalysis && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Detailed Analysis</p>
                    <div className="text-sm leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
                      {results.fullAnalysis}
                    </div>
                  </div>
                )}

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
