import { useState } from "react";
import InteractiveMap from "@/components/InteractiveMap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Play, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const africanRegions = [
  // West Africa
  "Lagos, Nigeria", "Abuja, Nigeria", "Kano, Nigeria", "Port Harcourt, Nigeria",
  "Accra, Ghana", "Kumasi, Ghana", "Ashanti Region, Ghana", "Volta Region, Ghana",
  "Dakar, Senegal", "Thiès, Senegal", "Saint-Louis, Senegal",
  "Abidjan, Côte d'Ivoire", "Yamoussoukro, Côte d'Ivoire", "Bouaké, Côte d'Ivoire",
  "Bamako, Mali", "Sikasso, Mali", "Mopti, Mali", "Timbuktu, Mali",
  "Ouagadougou, Burkina Faso", "Bobo-Dioulasso, Burkina Faso",
  "Niamey, Niger", "Zinder, Niger", "Maradi, Niger",
  "Conakry, Guinea", "Freetown, Sierra Leone", "Monrovia, Liberia",
  "Lomé, Togo", "Cotonou, Benin", "Banjul, The Gambia", "Bissau, Guinea-Bissau",
  
  // East Africa
  "Nairobi, Kenya", "Mombasa, Kenya", "Kisumu, Kenya", "Nakuru, Kenya",
  "Dar es Salaam, Tanzania", "Dodoma, Tanzania", "Arusha, Tanzania", "Mwanza, Tanzania",
  "Kampala, Uganda", "Entebbe, Uganda", "Gulu, Uganda", "Jinja, Uganda",
  "Addis Ababa, Ethiopia", "Dire Dawa, Ethiopia", "Mekelle, Ethiopia", "Bahir Dar, Ethiopia",
  "Kigali, Rwanda", "Butare, Rwanda", "Gisenyi, Rwanda",
  "Bujumbura, Burundi", "Gitega, Burundi",
  "Mogadishu, Somalia", "Hargeisa, Somalia", "Bosaso, Somalia",
  "Djibouti City, Djibouti", "Asmara, Eritrea",
  
  // Central Africa
  "Kinshasa, DRC", "Lubumbashi, DRC", "Goma, DRC", "Kisangani, DRC", "Bukavu, DRC",
  "Brazzaville, Republic of Congo", "Pointe-Noire, Republic of Congo",
  "Yaoundé, Cameroon", "Douala, Cameroon", "Garoua, Cameroon", "Bamenda, Cameroon",
  "Libreville, Gabon", "Port-Gentil, Gabon",
  "Bangui, Central African Republic",
  "Malabo, Equatorial Guinea", "Bata, Equatorial Guinea",
  "N'Djamena, Chad", "Moundou, Chad", "Sarh, Chad",
  "São Tomé, São Tomé and Príncipe",
  
  // Southern Africa
  "Cape Town, South Africa", "Johannesburg, South Africa", "Durban, South Africa", 
  "Pretoria, South Africa", "Port Elizabeth, South Africa", "Bloemfontein, South Africa",
  "Luanda, Angola", "Huambo, Angola", "Benguela, Angola", "Lubango, Angola",
  "Maputo, Mozambique", "Beira, Mozambique", "Nampula, Mozambique", "Matola, Mozambique",
  "Harare, Zimbabwe", "Bulawayo, Zimbabwe", "Mutare, Zimbabwe",
  "Lusaka, Zambia", "Kitwe, Zambia", "Ndola, Zambia", "Livingstone, Zambia",
  "Windhoek, Namibia", "Walvis Bay, Namibia", "Swakopmund, Namibia",
  "Gaborone, Botswana", "Francistown, Botswana", "Maun, Botswana",
  "Maseru, Lesotho", "Mbabane, Eswatini", "Antananarivo, Madagascar",
  "Port Louis, Mauritius", "Victoria, Seychelles",
  
  // North Africa
  "Cairo, Egypt", "Alexandria, Egypt", "Giza, Egypt", "Luxor, Egypt", "Aswan, Egypt",
  "Khartoum, Sudan", "Omdurman, Sudan", "Port Sudan, Sudan",
  "Juba, South Sudan", "Wau, South Sudan",
  "Tunis, Tunisia", "Sfax, Tunisia", "Sousse, Tunisia",
  "Algiers, Algeria", "Oran, Algeria", "Constantine, Algeria", "Annaba, Algeria",
  "Rabat, Morocco", "Casablanca, Morocco", "Marrakech, Morocco", "Fes, Morocco", "Tangier, Morocco",
  "Tripoli, Libya", "Benghazi, Libya", "Misrata, Libya",
  
  // Special Regions
  "Congo Basin", "Sahel Region", "Lake Victoria Region", "Nile Delta",
  "Okavango Delta, Botswana", "Zambezi River Basin", "Niger Delta, Nigeria",
  "Ethiopian Highlands", "Great Rift Valley", "Serengeti, Tanzania",
  "Virunga National Park, DRC", "Kruger National Park, South Africa"
];

const eventTypes = [
  // Vegetation & Forest
  { value: "deforestation", label: "Deforestation", icon: "🌳" },
  { value: "forest_degradation", label: "Forest Degradation", icon: "🌲" },
  { value: "reforestation", label: "Reforestation", icon: "🌱" },
  { value: "vegetation_loss", label: "Vegetation Loss", icon: "🍃" },
  { value: "mangrove_loss", label: "Mangrove Loss", icon: "🌿" },
  
  // Water-related
  { value: "flood", label: "Flood", icon: "🌊" },
  { value: "drought", label: "Drought", icon: "🏜️" },
  { value: "rainfall", label: "Rainfall Patterns", icon: "🌧️" },
  { value: "water_scarcity", label: "Water Scarcity", icon: "💧" },
  { value: "lake_drying", label: "Lake Drying", icon: "🏞️" },
  { value: "river_changes", label: "River Changes", icon: "🏞️" },
  { value: "wetland_loss", label: "Wetland Loss", icon: "🦆" },
  { value: "coastal_erosion", label: "Coastal Erosion", icon: "🏖️" },
  
  // Fire-related
  { value: "wildfire", label: "Wildfire", icon: "🔥" },
  { value: "bushfire", label: "Bushfire", icon: "🔥" },
  { value: "agricultural_burning", label: "Agricultural Burning", icon: "🔥" },
  
  // Climate & Weather
  { value: "climate_change", label: "Climate Change Impact", icon: "🌡️" },
  { value: "temperature_anomaly", label: "Temperature Anomaly", icon: "🌡️" },
  { value: "heatwave", label: "Heatwave", icon: "☀️" },
  { value: "cyclone", label: "Cyclone/Hurricane", icon: "🌀" },
  { value: "storm", label: "Storm Activity", icon: "⛈️" },
  
  // Land Degradation
  { value: "desertification", label: "Desertification", icon: "🏜️" },
  { value: "soil_erosion", label: "Soil Erosion", icon: "⛰️" },
  { value: "land_degradation", label: "Land Degradation", icon: "🪨" },
  { value: "salinization", label: "Soil Salinization", icon: "🧂" },
  
  // Agriculture
  { value: "agriculture", label: "Agricultural Change", icon: "🌾" },
  { value: "crop_health", label: "Crop Health", icon: "🌾" },
  { value: "irrigation_change", label: "Irrigation Change", icon: "💦" },
  { value: "livestock_impact", label: "Livestock Impact", icon: "🐄" },
  
  // Urban & Infrastructure
  { value: "urbanization", label: "Urbanization", icon: "🏙️" },
  { value: "urban_sprawl", label: "Urban Sprawl", icon: "🏘️" },
  { value: "infrastructure", label: "Infrastructure Development", icon: "🛤️" },
  { value: "mining", label: "Mining Activity", icon: "⛏️" },
  
  // Biodiversity & Ecosystems
  { value: "habitat_loss", label: "Habitat Loss", icon: "🦁" },
  { value: "ecosystem_change", label: "Ecosystem Change", icon: "🌍" },
  { value: "wildlife_migration", label: "Wildlife Migration", icon: "🦓" },
  
  // Air Quality
  { value: "air_pollution", label: "Air Pollution", icon: "💨" },
  { value: "dust_storms", label: "Dust Storms", icon: "🌪️" },
  
  // Other
  { value: "snow_ice", label: "Snow & Ice Changes", icon: "❄️" },
  { value: "glacier_melt", label: "Glacier Melting", icon: "🏔️" },
  { value: "volcanic_activity", label: "Volcanic Activity", icon: "🌋" },
];

const GeoWitness = () => {
  const [eventType, setEventType] = useState("deforestation");
  const [region, setRegion] = useState("Ashanti Region, Ghana");
  const [startDate, setStartDate] = useState("2022-01-01");
  const [endDate, setEndDate] = useState("2024-01-01");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([6.5, -1.5]);
  const [mapZoom, setMapZoom] = useState(7);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [mapPolygons, setMapPolygons] = useState<any[]>([]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setResults(null);
    toast.info("Starting AI-powered satellite analysis...");

    try {
      const coordinates = { lat: 6.5, lng: -1.5 }; // Default Ghana coordinates
      
      // Get current session for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-satellite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            eventType,
            region,
            startDate,
            endDate,
            coordinates,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
      
      // Update map visualization
      if (coordinates) {
        setMapCenter([coordinates.lat, coordinates.lng]);
        setMapZoom(10);
        
        // Add marker for analyzed location
        setMapMarkers([{
          lat: coordinates.lat,
          lng: coordinates.lng,
          label: `${region} - ${eventType}`,
          color: "#ef4444"
        }]);
        
        // Create polygon to show affected area (example boundary)
        const boundarySize = 0.1;
        setMapPolygons([{
          coordinates: [
            [coordinates.lat + boundarySize, coordinates.lng - boundarySize],
            [coordinates.lat + boundarySize, coordinates.lng + boundarySize],
            [coordinates.lat - boundarySize, coordinates.lng + boundarySize],
            [coordinates.lat - boundarySize, coordinates.lng - boundarySize],
          ] as [number, number][],
          label: `${data.changePercent}% ${eventType} detected`,
          color: data.changePercent > 50 ? "#ef4444" : "#f97316",
          fillOpacity: 0.2
        }]);
      }
      
      if (session) {
        toast.success("Analysis complete and saved to your history!");
      } else {
        toast.success("Analysis complete! Sign in to save your history.");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to complete analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col bg-background">
      <div className="flex-1 flex overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative">
          <InteractiveMap 
            center={mapCenter} 
            zoom={mapZoom} 
            className="h-full w-full"
            markers={mapMarkers}
            polygons={mapPolygons}
          />

          {/* Controls Overlay */}
          <div className="absolute top-6 left-6 z-[1000] space-y-4">
            <Card className="p-6 w-80 bg-card/95 backdrop-blur shadow-elevated">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Analysis Controls
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Event Type</label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px] overflow-y-auto">
                      {eventTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Region</label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px] overflow-y-auto">
                      {africanRegions.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-ocean hover:opacity-90"
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run AI Analysis
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  Powered by Google Earth Engine & AI
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Results Panel */}
        {results && (
          <div className="w-96 bg-card border-l border-border p-6 overflow-y-auto animate-slide-in-right">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Analysis Results</h2>
                <Button variant="ghost" size="icon">
                  <Download className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-destructive">High Impact Change Detected</p>
                  <p className="text-sm text-muted-foreground mt-1">Immediate attention recommended</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Event Type</p>
                  <p className="font-semibold capitalize">{results.eventType}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Area Analyzed</p>
                  <p className="font-semibold">{results.area}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Change Detected</p>
                  <p className="text-3xl font-bold text-destructive">{results.changePercent}%</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Summary</p>
                  <p className="text-sm leading-relaxed">{results.summary}</p>
                </div>

                {results.fullAnalysis && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Detailed Analysis</p>
                    <div className="text-sm leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
                      {results.fullAnalysis}
                    </div>
                  </div>
                )}

                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report (PDF)
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeoWitness;
