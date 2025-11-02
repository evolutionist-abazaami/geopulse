import { Link, useLocation } from "react-router-dom";
import { Globe, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const Navigation = () => {
  const location = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    document.documentElement.classList.add("dark");
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-gradient-ocean transition-transform group-hover:scale-105">
              <Globe className="h-6 w-6 text-primary-foreground" />
            </div>
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

            <Link to="/auth">
              <Button variant="default" className="bg-gradient-ocean hover:opacity-90">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
