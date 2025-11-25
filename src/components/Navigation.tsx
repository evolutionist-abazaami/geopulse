import { Link, useLocation, useNavigate } from "react-router-dom";
import { Moon, Sun, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import geopulseLogo from "@/assets/geopulse-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={geopulseLogo} 
              alt="GeoPulse Logo" 
              className="h-10 w-10 transition-transform group-hover:scale-105"
            />
            <span className="text-2xl font-bold bg-gradient-ocean bg-clip-text text-transparent">
              GeoPulse
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/geowitness"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/geowitness")
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              GeoWitness
            </Link>
            <Link
              to="/geosearch"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/geosearch")
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              GeoSearch
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/dashboard")
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                Dashboard
              </Link>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden md:inline">
                  {user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button variant="default" className="bg-gradient-ocean hover:opacity-90 gap-2">
                  <User className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
