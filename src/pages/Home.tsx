import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Satellite, Search, Globe2, TrendingUp, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";


const Home = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative overflow-hidden flex-1">
        {/* Hero Section */}
        <div className="relative z-10 container mx-auto px-4 md:px-6 pt-20 md:pt-32 pb-12 md:pb-20">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-2 mb-6 md:mb-8 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium">
              <Satellite className="h-3 w-3 md:h-4 md:w-4" />
              Powered by AI & Satellite Imagery
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight px-4">
              AI-Powered{" "}
              <span className="bg-gradient-ocean bg-clip-text text-transparent">
                Geospatial Intelligence
              </span>
              {" "}for Africa
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
              Monitor environmental changes, detect deforestation, track flooding events, 
              and analyze satellite imagery with cutting-edge AI technology.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
              {user ? (
                <>
                  <Link to="/geowitness" className="w-full sm:w-auto">
                    <Button size="lg" className="bg-gradient-ocean hover:opacity-90 shadow-elevated w-full sm:w-auto">
                      Launch GeoWitness
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/geosearch" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="border-2 w-full sm:w-auto">
                      Try GeoSearch
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth" className="w-full sm:w-auto">
                    <Button size="lg" className="bg-gradient-ocean hover:opacity-90 shadow-elevated gap-2 w-full sm:w-auto">
                      <Shield className="h-5 w-5" />
                      Sign In to Start
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/geowitness" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="border-2 w-full sm:w-auto">
                      Try Demo
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <div className="p-6 md:p-8 rounded-2xl bg-card border border-border hover:shadow-elevated transition-all hover:-translate-y-1">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-ocean flex items-center justify-center mb-4 md:mb-6">
                <Satellite className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Environmental Monitoring</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Track deforestation, floods, fires, and land use changes with precision satellite analysis.
              </p>
            </div>

            <div className="p-6 md:p-8 rounded-2xl bg-card border border-border hover:shadow-elevated transition-all hover:-translate-y-1">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-forest flex items-center justify-center mb-4 md:mb-6">
                <Search className="h-5 w-5 md:h-6 md:w-6 text-secondary-foreground" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">AI-Powered Search</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Ask questions in natural language and get instant geospatial insights powered by advanced NLP.
              </p>
            </div>

            <div className="p-6 md:p-8 rounded-2xl bg-card border border-border hover:shadow-elevated transition-all hover:-translate-y-1 sm:col-span-2 md:col-span-1">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 md:mb-6">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Change Detection</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Identify environmental changes over time with automated analysis and detailed reporting.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center p-8 md:p-12 rounded-3xl bg-gradient-hero shadow-glow">
            <Globe2 className="h-12 w-12 md:h-16 md:w-16 text-primary-foreground mx-auto mb-4 md:mb-6 opacity-90" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground mb-4 md:mb-6">
              Ready to explore Africa's environmental data?
            </h2>
            <p className="text-base md:text-lg text-primary-foreground/80 mb-6 md:mb-8 max-w-2xl mx-auto px-4">
              Join researchers, policymakers, and organizations using GeoPulse for data-driven environmental decisions.
            </p>
            <Link to={user ? "/geowitness" : "/auth"}>
              <Button size="lg" variant="secondary" className="bg-white/90 text-primary hover:bg-white shadow-xl">
                {user ? "Start Analyzing" : "Get Started Free"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
