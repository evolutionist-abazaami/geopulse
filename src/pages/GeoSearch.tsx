import { useState } from "react";
import InteractiveMap from "@/components/InteractiveMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Sparkles, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const GeoSearch = () => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([9.0, 1.0]);
  const [mapZoom, setMapZoom] = useState(6);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [mapPolygons, setMapPolygons] = useState<any[]>([]);

  const exampleQueries = [
    "Show me deforestation in the Congo Basin over the past 5 years",
    "Flooding patterns in West Africa during rainy season",
    "Urban expansion in East African cities since 2020",
    "Drought conditions in the Sahel region",
    "Coastal erosion along West African coastline",
    "Agricultural changes in the Nile Delta",
  ];

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
          body: JSON.stringify({ query }),
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
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
        
        if (firstLocation.boundary) {
          setMapPolygons([{
            coordinates: firstLocation.boundary,
            label: firstLocation.name || "Area of Interest",
            color: "#0891b2",
            fillOpacity: 0.2
          }]);
        }
      }
      
      if (session) {
        toast.success("Analysis complete and saved to your history!");
      } else {
        toast.success("Analysis complete! Sign in to save your searches.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to process search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col lg:flex-row bg-background overflow-hidden">
      {/* Map Container */}
      <div className="flex-1 relative h-[50vh] lg:h-full order-2 lg:order-1">
        <InteractiveMap
          center={mapCenter} 
          zoom={mapZoom} 
          className="h-full w-full"
          markers={mapMarkers}
          polygons={mapPolygons}
        />

        {/* Search Bar Overlay */}
        <div className="lg:absolute static lg:top-6 lg:left-1/2 lg:-translate-x-1/2 z-[1000] w-full max-w-2xl px-4 py-4 lg:py-0">
          <Card className="p-4 bg-card/95 backdrop-blur shadow-elevated">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Ask anything about environmental changes in Africa..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button 
                size="lg"
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
                className="bg-gradient-ocean hover:opacity-90 px-6"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {!results && (
              <div className="mt-4 pt-4 border-t border-border">
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
            
            <p className="text-xs text-muted-foreground text-center mt-3">
              Powered by AI & satellite data
            </p>
          </Card>
        </div>
      </div>

      {/* Results Panel */}
      {results && (
        <div className="w-full lg:w-96 bg-card lg:border-l border-t lg:border-t-0 border-border p-4 lg:p-6 overflow-y-auto order-3 max-h-[50vh] lg:max-h-full">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">AI Analysis</h2>
            </div>

            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm font-medium text-primary mb-1">Query Interpretation</p>
              <p className="text-sm text-muted-foreground">{results.interpretation}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Findings</p>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary font-medium">
                  {results.confidenceLevel}% confidence
                </span>
              </div>
              
              <div className="space-y-3">
                {results.findings && results.findings.length > 0 ? (
                  results.findings.map((finding: any, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <p className="text-sm">
                        {typeof finding === 'string' ? finding : finding.detail || finding.description || JSON.stringify(finding)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No specific findings at this time</p>
                )}
              </div>

              {results.recommendations && results.recommendations.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Recommendations:</p>
                  <div className="space-y-2">
                    {results.recommendations.map((rec: any, index: number) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        {typeof rec === 'string' ? rec : rec.detail || rec.description || JSON.stringify(rec)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                View on Map
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                Refine Search
              </Button>
            </div>

            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => {
                setResults(null);
                setQuery("");
              }}
            >
              New Search
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeoSearch;
