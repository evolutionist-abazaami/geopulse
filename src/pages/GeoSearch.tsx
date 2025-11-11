import { useState } from "react";
import Map from "@/components/Map";
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
      // Get current session for authenticated requests
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
    <div className="h-[calc(100vh-73px)] flex flex-col bg-background">
      <div className="flex-1 flex overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative">
          <Map center={[9.0, 1.0]} zoom={6} className="h-full w-full" />

          {/* Search Bar Overlay */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-2xl px-4">
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
          <div className="w-96 bg-card border-l border-border p-6 overflow-y-auto animate-slide-in-right">
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
                    results.findings.map((finding: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <p className="text-sm">{finding}</p>
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
                      {results.recommendations.map((rec: string, index: number) => (
                        <p key={index} className="text-sm text-muted-foreground">{rec}</p>
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
    </div>
  );
};

export default GeoSearch;
