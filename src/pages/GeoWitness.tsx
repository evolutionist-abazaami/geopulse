import { useState } from "react";
import MapLibreMap, { HeatmapLayerType } from "@/components/MapLibreMap";
import MapLayerControls from "@/components/MapLayerControls";
import LocationSearch from "@/components/LocationSearch";
import ReportGenerator from "@/components/ReportGenerator";
import FileUploadAnalysis from "@/components/FileUploadAnalysis";
import SavedLocations from "@/components/SavedLocations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Play, AlertTriangle, Loader2, MousePointer, Upload, ChevronDown, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const eventTypes = [
  // Vegetation & Forest
  { value: "deforestation", label: "Deforestation", icon: "🌳" },
  { value: "forest_degradation", label: "Forest Degradation", icon: "🌲" },
  { value: "reforestation", label: "Reforestation", icon: "🌱" },
  { value: "vegetation_loss", label: "Vegetation Loss", icon: "🍃" },
  { value: "mangrove_loss", label: "Mangrove Loss", icon: "🌿" },
  
  // Water-related
  { value: "flood", label: "Flood", icon: "🌊" },
  { value: "drought", label: "Drought", icon: "🏜️" },
  { value: "rainfall", label: "Rainfall Patterns", icon: "🌧️" },
  { value: "water_scarcity", label: "Water Scarcity", icon: "💧" },
  { value: "lake_drying", label: "Lake Drying", icon: "🏞️" },
  { value: "river_changes", label: "River Changes", icon: "🏞️" },
  { value: "wetland_loss", label: "Wetland Loss", icon: "🦆" },
  { value: "coastal_erosion", label: "Coastal Erosion", icon: "🏖️" },
  
  // Fire-related
  { value: "wildfire", label: "Wildfire", icon: "🔥" },
  { value: "bushfire", label: "Bushfire", icon: "🔥" },
  { value: "agricultural_burning", label: "Agricultural Burning", icon: "🔥" },
  
  // Climate & Weather
  { value: "climate_change", label: "Climate Change Impact", icon: "🌡️" },
  { value: "temperature_anomaly", label: "Temperature Anomaly", icon: "🌡️" },
  { value: "heatwave", label: "Heatwave", icon: "☀️" },
  { value: "cyclone", label: "Cyclone/Hurricane", icon: "🌀" },
  { value: "storm", label: "Storm Activity", icon: "⛈️" },
  
  // Land Degradation
  { value: "desertification", label: "Desertification", icon: "🏜️" },
  { value: "soil_erosion", label: "Soil Erosion", icon: "⛰️" },
  { value: "land_degradation", label: "Land Degradation", icon: "🪨" },
  { value: "salinization", label: "Soil Salinization", icon: "🧂" },
  
  // Agriculture
  { value: "agriculture", label: "Agricultural Change", icon: "🌾" },
  { value: "crop_health", label: "Crop Health", icon: "🌾" },
  { value: "irrigation_change", label: "Irrigation Change", icon: "💦" },
  { value: "livestock_impact", label: "Livestock Impact", icon: "🐄" },
  
  // Urban & Infrastructure
  { value: "urbanization", label: "Urbanization", icon: "🏙️" },
  { value: "urban_sprawl", label: "Urban Sprawl", icon: "🏘️" },
  { value: "infrastructure", label: "Infrastructure Development", icon: "🛤️" },
  { value: "mining", label: "Mining Activity", icon: "⛏️" },
  
  // Biodiversity & Ecosystems
  { value: "habitat_loss", label: "Habitat Loss", icon: "🦁" },
  { value: "ecosystem_change", label: "Ecosystem Change", icon: "🌍" },
  { value: "wildlife_migration", label: "Wildlife Migration", icon: "🦓" },
  
  // Air Quality
  { value: "air_pollution", label: "Air Pollution", icon: "💨" },
  { value: "dust_storms", label: "Dust Storms", icon: "🌪️" },
  
  // Other
  { value: "snow_ice", label: "Snow & Ice Changes", icon: "❄️" },
  { value: "glacier_melt", label: "Glacier Melting", icon: "🏔️" },
  { value: "volcanic_activity", label: "Volcanic Activity", icon: "🌋" },
];

const GeoWitness = () => {
  const [eventType, setEventType] = useState("deforestation");
  const [region, setRegion] = useState("");
  const [startDate, setStartDate] = useState("2022-01-01");
  const [endDate, setEndDate] = useState("2024-01-01");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([5.5, 20.0]);
  const [mapZoom, setMapZoom] = useState(4);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [mapPolygons, setMapPolygons] = useState<any[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState("search");
  const [is3DEnabled, setIs3DEnabled] = useState(false);
  const [activeHeatmapLayer, setActiveHeatmapLayer] = useState<HeatmapLayerType>("none");

  const handleLocationSelect = (location: { name: string; lat: number; lng: number; bounds?: [[number, number], [number, number]] }) => {
    setRegion(location.name);
    setSelectedLocation({ lat: location.lat, lng: location.lng, name: location.name });
    setMapCenter([location.lat, location.lng]);
    setMapZoom(10);
    setSelectionMode(false);
  };

  const handleMapClick = (location: { lat: number; lng: number; name: string }) => {
    setSelectedLocation(location);
    setRegion(location.name);
    setMapCenter([location.lat, location.lng]);
    toast.success(`Selected: ${location.name}`);
  };

  const runAnalysis = async () => {
    if (!region && !selectedLocation) {
      toast.error("Please select a location first");
      return;
    }

    setIsAnalyzing(true);
    setResults(null);
    toast.info("Starting AI-powered satellite analysis...");

    try {
      const coordinates = selectedLocation || { lat: mapCenter[0], lng: mapCenter[1] };
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
            region: region || selectedLocation?.name,
            startDate,
            endDate,
            coordinates,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please wait a moment and try again.");
          return;
        }
        if (response.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
          return;
        }
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
      
      setMapMarkers([{
        lat: coordinates.lat,
        lng: coordinates.lng,
        label: `${region || selectedLocation?.name} - ${eventType}`,
        color: "#ef4444"
      }]);
      
      const boundarySize = 0.15;
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
      
      if (session) {
        toast.success("Analysis complete and saved!");
      } else {
        toast.success("Analysis complete! Sign in to save history.");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to complete analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col lg:flex-row bg-background overflow-hidden">
      {/* Map Container */}
      <div className="flex-1 relative h-[40vh] lg:h-full order-2 lg:order-1">
        <MapLibreMap 
          center={mapCenter} 
          zoom={mapZoom} 
          className="h-full w-full"
          markers={mapMarkers}
          polygons={mapPolygons}
          selectionMode={selectionMode}
          onLocationSelect={handleMapClick}
          selectedArea={selectedLocation}
          is3DEnabled={is3DEnabled}
          activeHeatmapLayer={activeHeatmapLayer}
        />

        {/* Layer Controls */}
        <MapLayerControls
          is3DEnabled={is3DEnabled}
          onToggle3D={setIs3DEnabled}
          activeHeatmapLayer={activeHeatmapLayer}
          onHeatmapLayerChange={setActiveHeatmapLayer}
        />

        {/* Selection Mode Indicator */}
        {selectionMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
            <Card className="px-4 py-2 bg-primary text-primary-foreground flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              <span className="text-sm font-medium">Click on map to select location</span>
              <Button 
                size="sm" 
                variant="secondary" 
                className="ml-2 h-7"
                onClick={() => setSelectionMode(false)}
              >
                Cancel
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Controls Panel */}
      <div className="w-full lg:w-[420px] bg-card lg:border-l border-b lg:border-b-0 border-border overflow-y-auto order-1 lg:order-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b border-border p-0 h-auto bg-transparent">
            <TabsTrigger 
              value="search" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              Location Analysis
            </TabsTrigger>
            <TabsTrigger 
              value="upload" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              <Upload className="h-4 w-4 mr-2" />
              File Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="flex-1 p-4 md:p-6 space-y-4 mt-0 overflow-y-auto">
            <div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Analysis Controls
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Event Type</label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
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
                  <label className="text-sm font-medium mb-2 block">Search Location</label>
                  <LocationSearch 
                    onLocationSelect={handleLocationSelect}
                    placeholder="Search any place in Africa..."
                    defaultValue={region}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Search for any city, town, district, region, or landmark
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectionMode(!selectionMode)}
                >
                  <MousePointer className="h-4 w-4 mr-2" />
                  {selectionMode ? "Cancel Selection" : "Select on Map"}
                </Button>

                {selectedLocation && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-primary">Selected Location:</p>
                    <p className="text-sm truncate">{selectedLocation.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                    </p>
                  </div>
                )}

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
                  disabled={isAnalyzing || (!region && !selectedLocation)}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run AI Analysis
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Saved Locations */}
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                  <span className="flex items-center gap-2 font-bold text-lg">
                    <Star className="h-5 w-5 text-primary" />
                    Watchlist
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <SavedLocations 
                  onLocationSelect={handleLocationSelect}
                  currentLocation={selectedLocation}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Results */}
            {results && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-lg">Analysis Results</h4>
                </div>

                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-destructive text-sm">High Impact Detected</p>
                    <p className="text-xs text-muted-foreground">Attention recommended</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Event</p>
                    <p className="font-semibold text-sm capitalize">{results.eventType}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Change</p>
                    <p className="font-bold text-xl text-destructive">{results.changePercent}%</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Area</p>
                  <p className="text-sm font-medium">{results.area}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Summary</p>
                  <p className="text-sm leading-relaxed">{results.summary}</p>
                </div>

                {results.fullAnalysis && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Detailed Analysis</p>
                    <div className="text-sm leading-relaxed max-h-40 overflow-y-auto bg-muted/30 p-3 rounded-lg">
                      {results.fullAnalysis}
                    </div>
                  </div>
                )}

                <ReportGenerator 
                  analysisData={results} 
                  eventType={eventType}
                  region={region || selectedLocation?.name}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 p-4 md:p-6 mt-0 overflow-y-auto">
            <FileUploadAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GeoWitness;
