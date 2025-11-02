import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Satellite, Search, Globe2, TrendingUp } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <div className="relative z-10 container mx-auto px-6 pt-32 pb-20">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Satellite className="h-4 w-4" />
              Powered by AI & Satellite Imagery
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              AI-Powered{" "}
              <span className="bg-gradient-ocean bg-clip-text text-transparent">
                Geospatial Intelligence
              </span>
              {" "}for Africa
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Monitor environmental changes, detect deforestation, track flooding events, 
              and analyze satellite imagery with cutting-edge AI technology.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/geowitness">
                <Button size="lg" className="bg-gradient-ocean hover:opacity-90 shadow-elevated">
                  Launch GeoWitness
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/geosearch">
                <Button size="lg" variant="outline" className="border-2">
                  Try GeoSearch
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="container mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-elevated transition-all hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-gradient-ocean flex items-center justify-center mb-6">
                <Satellite className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">Environmental Monitoring</h3>
              <p className="text-muted-foreground leading-relaxed">
                Track deforestation, floods, fires, and land use changes with precision satellite analysis.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-elevated transition-all hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-gradient-forest flex items-center justify-center mb-6">
                <Search className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI-Powered Search</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ask questions in natural language and get instant geospatial insights powered by advanced NLP.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-elevated transition-all hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Change Detection</h3>
              <p className="text-muted-foreground leading-relaxed">
                Identify environmental changes over time with automated analysis and detailed reporting.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-hero shadow-glow">
            <Globe2 className="h-16 w-16 text-primary-foreground mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
              Ready to explore Africa's environmental data?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Join researchers, policymakers, and organizations using GeoPulse for data-driven environmental decisions.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="bg-white/90 text-primary hover:bg-white shadow-xl">
                Get Started Free
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
