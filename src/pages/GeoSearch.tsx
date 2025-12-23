import { useState } from "react";
import MapLibreMap, { HeatmapLayerType } from "@/components/MapLibreMap";
import MapLayerControls from "@/components/MapLayerControls";
import LocationSearch from "@/components/LocationSearch";
import ReportGenerator from "@/components/ReportGenerator";
import FileUploadAnalysis from "@/components/FileUploadAnalysis";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles, Loader2, MousePointer, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const GeoSearch = () => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
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

  const exampleQueries = [
    "Deforestation in Congo Basin 2020-2024",
    "Flooding in Nigeria during rainy season",
    "Urban expansion in Nairobi since 2015",
    "Drought in Sahel region",
    "Mining activity in South Africa",
  ];

  const handleLocationSearch = (location: { name: string; lat: number; lng: number }) => {
    setSelectedLocation(location);
    setMapCenter([location.lat, location.lng]);
    setMapZoom(10);
    setQuery((prev) => {
      if (prev.trim()) return `${prev} in ${location.name}`;
      return `Environmental changes in ${location.name}`;
    });
  };

  const handleMapClick = (location: { lat: number; lng: number; name: string }) => {
    setSelectedLocation(location);
    setMapCenter([location.lat, location.lng]);
    setSelectionMode(false);
    toast.success(`Selected: ${location.name}`);
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    setResults(null);
    toast.info("Analyzing your query with AI...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            query,
            selectedLocation: selectedLocation ? {
              lat: selectedLocation.lat,
              lng: selectedLocation.lng,
              name: selectedLocation.name
            } : null
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
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Search results:", data);
      setResults(data);
      
      if (data.locations && data.locations.length > 0) {
        const firstLocation = data.locations[0];
        
        const markers = data.locations.map((loc: any, idx: number) => ({
          lat: loc.lat || 6.5,
          lng: loc.lng || -1.5,
          label: loc.name || `Location ${idx + 1}`,
          color: "#0891b2"
        }));
        setMapMarkers(markers);
        
        if (firstLocation.lat && firstLocation.lng) {
          setMapCenter([firstLocation.lat, firstLocation.lng]);
          setMapZoom(8);
        }
        
        // Create boundary polygon if location coordinates exist
        if (firstLocation.lat && firstLocation.lng) {
          const boundarySize = 0.2;
          setMapPolygons([{
            coordinates: [
              [firstLocation.lng - boundarySize, firstLocation.lat + boundarySize],
              [firstLocation.lng + boundarySize, firstLocation.lat + boundarySize],
              [firstLocation.lng + boundarySize, firstLocation.lat - boundarySize],
              [firstLocation.lng - boundarySize, firstLocation.lat - boundarySize],
              [firstLocation.lng - boundarySize, firstLocation.lat + boundarySize],
            ] as [number, number][],
            label: firstLocation.name || "Area of Interest",
            color: "#0891b2",
            fillOpacity: 0.25
          }]);
        }
      } else if (selectedLocation) {
        // Create visualization for selected location
        setMapMarkers([{
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          label: selectedLocation.name,
          color: "#0891b2"
        }]);
        
        // Create boundary around selected location
        const boundarySize = 0.15;
        setMapPolygons([{
          coordinates: [
            [selectedLocation.lng - boundarySize, selectedLocation.lat + boundarySize],
            [selectedLocation.lng + boundarySize, selectedLocation.lat + boundarySize],
            [selectedLocation.lng + boundarySize, selectedLocation.lat - boundarySize],
            [selectedLocation.lng - boundarySize, selectedLocation.lat - boundarySize],
            [selectedLocation.lng - boundarySize, selectedLocation.lat + boundarySize],
          ] as [number, number][],
          label: data.interpretation || selectedLocation.name,
          color: "#0891b2",
          fillOpacity: 0.25
        }]);
        
        setMapCenter([selectedLocation.lat, selectedLocation.lng]);
        setMapZoom(10);
      }
      
      if (session) {
        toast.success("Analysis complete and saved!");
      } else {
        toast.success("Analysis complete! Sign in to save searches.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to process search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col bg-background">
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
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

      {/* Search Panel */}
      <div className="w-full lg:w-[420px] bg-card lg:border-l border-b lg:border-b-0 border-border overflow-y-auto order-1 lg:order-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b border-border p-0 h-auto bg-transparent">
            <TabsTrigger 
              value="search" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              <Search className="h-4 w-4 mr-2" />
              AI Search
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
            {/* Search Input */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Natural Language Query</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ask about environmental changes..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Search Location (Optional)</label>
                <LocationSearch 
                  onLocationSelect={handleLocationSearch}
                  placeholder="Search any place in Africa..."
                />
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
                {selectionMode ? "Cancel Selection" : "Select Location on Map"}
              </Button>

              {selectedLocation && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium text-primary">Selected Location:</p>
                  <p className="text-sm truncate">{selectedLocation.name}</p>
                </div>
              )}

              <Button 
                className="w-full bg-gradient-ocean hover:opacity-90"
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Search with AI
                  </>
                )}
              </Button>

              {/* Example Queries */}
              {!results && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Example queries:</p>
                  <div className="flex flex-wrap gap-2">
                    {exampleQueries.map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(example)}
                        className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            {results && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h4 className="font-bold">AI Analysis</h4>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs font-medium text-primary mb-1">Query Interpretation</p>
                  <p className="text-sm text-muted-foreground">{results.interpretation}</p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Findings</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary font-medium">
                    {results.confidenceLevel}% confidence
                  </span>
                </div>
                
                <div className="space-y-2">
                  {results.findings && results.findings.length > 0 ? (
                    results.findings.slice(0, 5).map((finding: any, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <p className="text-sm">
                          {typeof finding === 'string' ? finding : finding.detail || finding.description || JSON.stringify(finding)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific findings</p>
                  )}
                </div>

                {results.recommendations && results.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Recommendations:</p>
                    <div className="space-y-1">
                      {results.recommendations.slice(0, 3).map((rec: any, index: number) => (
                        <p key={index} className="text-sm text-muted-foreground">
                          • {typeof rec === 'string' ? rec : rec.detail || JSON.stringify(rec)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <ReportGenerator 
                  analysisData={results}
                  region={selectedLocation?.name}
                />

                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setResults(null);
                    setQuery("");
                    setSelectedLocation(null);
                    setMapMarkers([]);
                    setMapPolygons([]);
                  }}
                >
                  New Search
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 p-4 md:p-6 mt-0 overflow-y-auto">
            <FileUploadAnalysis />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default GeoSearch;
