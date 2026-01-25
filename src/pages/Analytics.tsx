import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendChart } from "@/components/charts/TrendChart";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { ComparisonChart } from "@/components/charts/ComparisonChart";
import GISExportButton from "@/components/GISExportButton";
import { Loader2, TrendingUp, BarChart3, PieChart, Download } from "lucide-react";
import { format } from "date-fns";
import { AnalysisFeature, dbResultToFeature } from "@/lib/gis-export";


const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [searchQueries, setSearchQueries] = useState<any[]>([]);

  useEffect(() => {
    checkUser();
    fetchData();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const fetchData = async () => {
    try {
      const [analysisRes, searchRes] = await Promise.all([
        supabase.from("analysis_results").select("*").order("created_at", { ascending: true }),
        supabase.from("search_queries").select("*").order("created_at", { ascending: true }),
      ]);

      setAnalysisResults(analysisRes.data || []);
      setSearchQueries(searchRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const activityTrend = analysisResults
    .map((item) => ({
      date: format(new Date(item.created_at), "MMM dd"),
      value: item.change_percent || 0,
    }))
    .slice(-10);

  const eventDistribution = Object.entries(
    analysisResults.reduce((acc: any, item) => {
      acc[item.event_type] = (acc[item.event_type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number }));

  const regionDistribution = Object.entries(
    analysisResults.reduce((acc: any, item) => {
      const region = item.region?.split(",")[0] || "Unknown";
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value: value as number }))
    .slice(0, 8);

  const confidenceTrend = searchQueries
    .map((item) => ({
      date: format(new Date(item.created_at), "MMM dd"),
      value: item.confidence_level || 0,
    }))
    .slice(-10);

  const changeComparison = analysisResults
    .slice(-6)
    .map((item) => ({
      name: item.region?.split(",")[0] || "Unknown",
      before: 100,
      after: 100 - (item.change_percent || 0),
    }));

  if (loading) {
    return (
      <div className="h-[calc(100vh-73px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-ocean bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
              Comprehensive data visualization and insights
            </p>
          </div>
          
          {/* GIS Export for all analysis results */}
          {analysisResults.length > 0 && (
            <GISExportButton
              features={analysisResults
                .map(dbResultToFeature)
                .filter((f): f is AnalysisFeature => f !== null)}
              filename="geopulse-all-analyses"
              variant="outline"
              size="default"
            />
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Analyses</p>
                <p className="text-xl md:text-2xl font-bold">{analysisResults.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-secondary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Searches</p>
                <p className="text-xl md:text-2xl font-bold">{searchQueries.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <PieChart className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Avg Change</p>
                <p className="text-xl md:text-2xl font-bold">
                  {analysisResults.length > 0
                    ? Math.round(
                        analysisResults.reduce((acc, item) => acc + (item.change_percent || 0), 0) /
                          analysisResults.length
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-xl md:text-2xl font-bold">
                  {searchQueries.length > 0
                    ? Math.round(
                        searchQueries.reduce((acc, item) => acc + (item.confidence_level || 0), 0) /
                          searchQueries.length
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-1">
            <TabsTrigger value="trends" className="text-xs md:text-sm">Trends</TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs md:text-sm">Distribution</TabsTrigger>
            <TabsTrigger value="comparison" className="text-xs md:text-sm">Comparison</TabsTrigger>
            <TabsTrigger value="confidence" className="text-xs md:text-sm">Confidence</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4 mt-4 md:mt-6">
            <div className="grid grid-cols-1 gap-4">
              <TrendChart
                data={activityTrend}
                title="Change Percentage Over Time"
                color="hsl(var(--primary))"
              />
              <DistributionChart
                data={regionDistribution}
                title="Analyses by Region"
                color="hsl(var(--secondary))"
              />
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4 mt-4 md:mt-6">
            <div className="grid grid-cols-1 gap-4">
              <DistributionChart
                data={eventDistribution}
                title="Event Type Distribution"
                color="hsl(var(--primary))"
              />
              <DistributionChart
                data={regionDistribution}
                title="Regional Analysis Distribution"
                color="hsl(var(--accent))"
              />
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4 mt-4 md:mt-6">
            <ComparisonChart
              data={changeComparison}
              title="Environmental Change Comparison (Before vs After)"
              color1="hsl(var(--secondary))"
              color2="hsl(var(--primary))"
            />
          </TabsContent>

          <TabsContent value="confidence" className="space-y-4 mt-4 md:mt-6">
            <TrendChart
              data={confidenceTrend}
              title="AI Confidence Level Over Time"
              color="hsl(var(--accent))"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;
