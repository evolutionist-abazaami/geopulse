import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Search, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";


type AnalysisResult = {
  id: string;
  event_type: string;
  region: string;
  start_date: string;
  end_date: string;
  change_percent: number | null;
  summary: string | null;
  created_at: string;
  area_analyzed: string | null;
  coordinates: any;
};

type SearchQuery = {
  id: string;
  query: string;
  ai_interpretation: string | null;
  confidence_level: number | null;
  results: any;
  created_at: string;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please sign in to view your dashboard");
      navigate("/auth");
      return;
    }

    setUser(user);
    await fetchData();
  };

  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch analysis results
      const { data: analyses, error: analysisError } = await supabase
        .from("analysis_results")
        .select("*")
        .order("created_at", { ascending: false });

      if (analysisError) throw analysisError;
      setAnalysisResults(analyses || []);

      // Fetch search queries
      const { data: searches, error: searchError } = await supabase
        .from("search_queries")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchError) throw searchError;
      setSearchQueries(searches || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToJSON = (data: any[], filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON file downloaded successfully");
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return JSON.stringify(value).replace(/"/g, '""');
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    }

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV file downloaded successfully");
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-73px)] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-ocean bg-clip-text text-transparent">
              Analysis Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
              View and export your complete analysis history
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToJSON([...analysisResults, ...searchQueries], "complete_history")}
              className="flex-1 md:flex-none"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export All (JSON)</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Analyses</p>
                <p className="text-2xl font-bold">{analysisResults.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-secondary/10">
                <Search className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Searches</p>
                <p className="text-2xl font-bold">{searchQueries.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{analysisResults.length + searchQueries.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Data Tables */}
        <Tabs defaultValue="analyses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="analyses">GeoWitness Analyses</TabsTrigger>
            <TabsTrigger value="searches">GeoSearch Queries</TabsTrigger>
          </TabsList>

          <TabsContent value="analyses" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(analysisResults, "geowitness_analyses")}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToJSON(analysisResults, "geowitness_analyses")}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>

            <div className="space-y-3">
              {analysisResults.length === 0 ? (
                <Card className="p-8 text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No analysis results yet</p>
                  <Button variant="link" onClick={() => navigate("/geowitness")}>
                    Start analyzing
                  </Button>
                </Card>
              ) : (
                analysisResults.map((result) => (
                  <Card key={result.id} className="p-3 md:p-4 hover:shadow-elevated transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                            {result.event_type}
                          </span>
                          <span className="text-xs md:text-sm text-muted-foreground">
                            {new Date(result.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-semibold mb-1 text-sm md:text-base">{result.region}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground mb-2">
                          {result.start_date} to {result.end_date}
                        </p>
                        {result.change_percent !== null && (
                          <p className="text-xs md:text-sm">
                            <span className="font-medium">Change detected:</span>{" "}
                            <span className="text-destructive font-bold">{result.change_percent}%</span>
                          </p>
                        )}
                        {result.summary && (
                          <p className="text-xs md:text-sm text-muted-foreground mt-2 line-clamp-2">
                            {result.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="searches" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(searchQueries, "geosearch_queries")}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToJSON(searchQueries, "geosearch_queries")}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>

            <div className="space-y-3">
              {searchQueries.length === 0 ? (
                <Card className="p-8 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No search queries yet</p>
                  <Button variant="link" onClick={() => navigate("/geosearch")}>
                    Start searching
                  </Button>
                </Card>
              ) : (
                searchQueries.map((query) => (
                  <Card key={query.id} className="p-3 md:p-4 hover:shadow-elevated transition-shadow">
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <h3 className="font-semibold text-sm md:text-base break-words">{query.query}</h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(query.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {query.confidence_level && (
                        <span className="inline-block px-2 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-medium">
                          {query.confidence_level}% confidence
                        </span>
                      )}
                      {query.ai_interpretation && (
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                          {query.ai_interpretation}
                        </p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
