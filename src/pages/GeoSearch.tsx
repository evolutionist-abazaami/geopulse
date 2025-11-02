import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, MapPin } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

const GeoSearch = () => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any>(null);

  const exampleQueries = [
    "Show me areas with forest loss in Ashanti region in 2023",
    "Where has flooding occurred in Nigeria over the past year?",
    "Detect urban expansion in Lagos between 2020 and 2024"
  ];

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    toast.info("Processing your query with AI...");

    // Simulate AI processing
    setTimeout(() => {
      setResults({
        query,
        interpretation: "Searching for deforestation patterns in the Ashanti region during 2023",
        findings: "Detected 32 km² of deforested land in the Ashanti region in 2023. Primary locations include the Mampong and Ejisu districts.",
        confidence: 92,
        markers: []
      });
      setIsSearching(false);
      toast.success("Search complete!");
    }, 2500);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex-1 flex overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer
            center={[9.0, 1.0]}
            zoom={6}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
          </MapContainer>

          {/* Search Bar Overlay */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-2xl px-4">
            <Card className="p-4 bg-card/95 backdrop-blur shadow-elevated">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Ask anything about environmental changes..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10 h-12 text-base"
                  />
                </div>
                <Button 
                  size="lg"
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="bg-gradient-ocean hover:opacity-90 px-6"
                >
                  {isSearching ? (
                    <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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
                    {results.confidence}% confidence
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{results.findings}</p>
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
                onClick={() => setResults(null)}
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
