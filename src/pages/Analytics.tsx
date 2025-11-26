import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendChart } from "@/components/charts/TrendChart";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { ComparisonChart } from "@/components/charts/ComparisonChart";
import { Loader2, TrendingUp, BarChart3, PieChart } from "lucide-react";
import { format } from "date-fns";

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
    <div className="min-h-[calc(100vh-73px)] bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive visualization of your environmental analysis data
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Analyses</p>
                <p className="text-2xl font-bold">{analysisResults.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Searches</p>
                <p className="text-2xl font-bold">{searchQueries.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <PieChart className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Change</p>
                <p className="text-2xl font-bold">
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

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
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
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="confidence">Confidence</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

          <TabsContent value="distribution" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

          <TabsContent value="comparison" className="space-y-4 mt-6">
            <ComparisonChart
              data={changeComparison}
              title="Environmental Change Comparison (Before vs After)"
              color1="hsl(var(--secondary))"
              color2="hsl(var(--primary))"
            />
          </TabsContent>

          <TabsContent value="confidence" className="space-y-4 mt-6">
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
