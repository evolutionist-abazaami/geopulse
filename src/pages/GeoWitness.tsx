import { useState } from "react";
import MapLibreMap, { HeatmapLayerType } from "@/components/MapLibreMap";
import MapLayerControls from "@/components/MapLayerControls";
import LocationSearch from "@/components/LocationSearch";
import ReportGenerator from "@/components/ReportGenerator";
import FileUploadAnalysis from "@/components/FileUploadAnalysis";
import SavedLocations from "@/components/SavedLocations";
import ComparisonMode from "@/components/ComparisonMode";
import TimeLapseAnimation from "@/components/TimeLapseAnimation";
import GISExportButton from "@/components/GISExportButton";
import MultiEventSelector from "@/components/MultiEventSelector";
import ShapefileImport from "@/components/ShapefileImport";
import CloudCoverageDisplay from "@/components/CloudCoverageDisplay";
import ClassificationControls, { ClassificationType } from "@/components/ClassificationControls";
import ClassificationResults from "@/components/ClassificationResults";
import SpectralIndicesDisplay from "@/components/SpectralIndicesDisplay";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Play, AlertTriangle, Loader2, MousePointer, Upload, ChevronDown, Star, GitCompare, Clock, Layers, FileType, Satellite } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AnalysisFeature } from "@/lib/gis-export";

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
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [isMultiEventMode, setIsMultiEventMode] = useState(false);
  const [region, setRegion] = useState("");
  const [startDate, setStartDate] = useState("2022-01-01");
  const [endDate, setEndDate] = useState("2024-01-01");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([5.5, 20.0]);
  const [mapZoom, setMapZoom] = useState(4);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [mapPolygons, setMapPolygons] = useState<any[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<{ lat: number; lng: number; name: string }[]>([]);
  const [activeTab, setActiveTab] = useState("search");
  const [is3DEnabled, setIs3DEnabled] = useState(false);
  const [activeHeatmapLayer, setActiveHeatmapLayer] = useState<HeatmapLayerType>("none");
  const [importedFeatures, setImportedFeatures] = useState<AnalysisFeature[]>([]);
  const [classificationType, setClassificationType] = useState<ClassificationType>(null);
  const [enableChangeDetection, setEnableChangeDetection] = useState(false);
  const [numClasses, setNumClasses] = useState(6);

  const handleLocationSelect = (location: { name: string; lat: number; lng: number; bounds?: [[number, number], [number, number]] }) => {
    setRegion(location.name);
    setSelectedLocation({ lat: location.lat, lng: location.lng, name: location.name });
    setMapCenter([location.lat, location.lng]);
    setMapZoom(10);
    setSelectionMode(false);
  };

  const handleMapClick = (location: { lat: number; lng: number; name: string }) => {
    // Add to selected points array for polygon drawing
    const newPoints = [...selectedPoints, location];
    setSelectedPoints(newPoints);
    setSelectedLocation(location);
    setRegion(location.name);
    
    // Create markers for all selected points
    const markers = newPoints.map((pt, index) => ({
      lat: pt.lat,
      lng: pt.lng,
      label: `Point ${index + 1}: ${pt.name}`,
      color: index === newPoints.length - 1 ? "#0891b2" : "#6366f1"
    }));
    setMapMarkers(markers);
    
    // If 3+ points, draw polygon connecting them
    if (newPoints.length >= 3) {
      const polygonCoords: [number, number][] = newPoints.map(pt => [pt.lng, pt.lat]);
      polygonCoords.push([newPoints[0].lng, newPoints[0].lat]); // Close the polygon
      
      setMapPolygons([{
        coordinates: polygonCoords,
        label: `Selection Area (${newPoints.length} points)`,
        color: "#0891b2",
        fillOpacity: 0.2
      }]);
    } else if (newPoints.length === 2) {
      // Draw line between 2 points (as thin polygon)
      setMapPolygons([{
        coordinates: [
          [newPoints[0].lng, newPoints[0].lat],
          [newPoints[1].lng, newPoints[1].lat],
          [newPoints[1].lng + 0.001, newPoints[1].lat + 0.001],
          [newPoints[0].lng + 0.001, newPoints[0].lat + 0.001],
          [newPoints[0].lng, newPoints[0].lat],
        ] as [number, number][],
        label: "Selection Line",
        color: "#0891b2",
        fillOpacity: 0.1
      }]);
    }
    
    toast.success(`Point ${newPoints.length} selected: ${location.name}`);
  };

  const handleShapefileImport = (features: AnalysisFeature[], bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => {
    setImportedFeatures(features);
    
    // Add markers for all imported features
    const markers = features.map((f, i) => ({
      lat: f.coordinates.lat,
      lng: f.coordinates.lng,
      label: f.name,
      color: "#3b82f6"
    }));
    setMapMarkers(markers);
    
    // Fit map to bounds
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    setMapCenter([centerLat, centerLng]);
    setMapZoom(8);
    
    toast.success(`Loaded ${features.length} features from GIS file`);
  };

  const runAnalysis = async () => {
    if (!region && !selectedLocation) {
      toast.error("Please select a location first");
      return;
    }

    const eventTypesToAnalyze = isMultiEventMode && selectedEventTypes.length > 0 
      ? selectedEventTypes 
      : [eventType];

    setIsAnalyzing(true);
    setResults(null);
    toast.info(`Starting AI-powered satellite analysis for ${eventTypesToAnalyze.length} event type(s)...`);

    try {
      const coordinates = selectedLocation || { lat: mapCenter[0], lng: mapCenter[1] };
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
            eventTypes: eventTypesToAnalyze,
            eventType: eventTypesToAnalyze[0],
            region: region || selectedLocation?.name,
            startDate,
            endDate,
            coordinates,
            classificationType,
            enableChangeDetection,
            numClasses,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please wait a moment and try again.");
          return;
        }
        if (response.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
          return;
        }
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Analysis result:", data);
      setResults(data);
      
      // Set marker at the analyzed location
      setMapMarkers([{
        lat: coordinates.lat,
        lng: coordinates.lng,
        label: `${region || selectedLocation?.name} - ${eventType}`,
        color: data.changePercent > 50 ? "#ef4444" : "#f97316"
      }]);
      
      // Create analysis boundary polygon - coordinates in [lat, lng] format for MapLibre
      const boundarySize = 0.15;
      const changePercent = data.changePercent || 0;
      setMapPolygons([{
        coordinates: [
          [coordinates.lng - boundarySize, coordinates.lat + boundarySize],
          [coordinates.lng + boundarySize, coordinates.lat + boundarySize],
          [coordinates.lng + boundarySize, coordinates.lat - boundarySize],
          [coordinates.lng - boundarySize, coordinates.lat - boundarySize],
          [coordinates.lng - boundarySize, coordinates.lat + boundarySize], // Close the polygon
        ] as [number, number][],
        label: `${changePercent}% ${eventType} detected`,
        color: changePercent > 50 ? "#ef4444" : changePercent > 25 ? "#f97316" : "#22c55e",
        fillOpacity: 0.3
      }]);
      
      // Zoom to the analyzed area
      setMapCenter([coordinates.lat, coordinates.lng]);
      setMapZoom(10);
      
      if (session) {
        toast.success("Analysis complete and saved!");
      } else {
        toast.success("Analysis complete! Sign in to save history.");
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
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map Container - Larger on mobile for better interaction */}
      <div className="flex-1 relative h-[50vh] sm:h-[55vh] lg:h-full order-2 lg:order-1 min-h-[300px]">
        <MapLibreMap 
          center={mapCenter} 
          zoom={mapZoom} 
          className="h-full w-full"
          markers={mapMarkers}
          polygons={mapPolygons}
          selectionMode={selectionMode}
          onLocationSelect={handleMapClick}
          selectedArea={selectedLocation}
          is3DEnabled={is3DEnabled}
          activeHeatmapLayer={activeHeatmapLayer}
          showFullscreenControl={true}
          showGeolocateControl={true}
        />

        {/* Layer Controls - Responsive positioning */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10">
          <MapLayerControls
            is3DEnabled={is3DEnabled}
            onToggle3D={setIs3DEnabled}
            activeHeatmapLayer={activeHeatmapLayer}
            onHeatmapLayerChange={setActiveHeatmapLayer}
          />
        </div>

        {/* Zoom to Selection Button */}
        {selectedLocation && (
          <div className="absolute bottom-16 right-2 sm:bottom-20 sm:right-4 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="shadow-lg"
              onClick={() => {
                setMapCenter([selectedLocation.lat, selectedLocation.lng]);
                setMapZoom(12);
              }}
            >
              Zoom to Selection
            </Button>
          </div>
        )}

        {/* Selection Mode Indicator */}
        {selectionMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] sm:top-4">
            <Card className="px-3 py-2 sm:px-4 sm:py-2 bg-primary text-primary-foreground flex items-center gap-2 flex-wrap justify-center">
              <MousePointer className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium">
                Click to select points {selectedPoints.length > 0 && `(${selectedPoints.length} selected)`}
              </span>
              {selectedPoints.length > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 sm:h-7 text-xs bg-white/20 hover:bg-white/30"
                  onClick={() => {
                    setSelectedPoints([]);
                    setMapMarkers([]);
                    setMapPolygons([]);
                    setSelectedLocation(null);
                    toast.info("Selection cleared");
                  }}
                >
                  Clear
                </Button>
              )}
              <Button 
                size="sm" 
                variant="secondary" 
                className="h-6 sm:h-7 text-xs"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedPoints([]);
                  // Reset to Africa overview when cancelling selection
                  setMapCenter([5.5, 20.0]);
                  setMapZoom(4);
                  setMapMarkers([]);
                  setMapPolygons([]);
                  setSelectedLocation(null);
                }}
              >
                Cancel
              </Button>
              {selectedPoints.length >= 3 && (
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="h-6 sm:h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    setSelectionMode(false);
                    toast.success(`Polygon with ${selectedPoints.length} points confirmed`);
                  }}
                >
                  Done
                </Button>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Controls Panel */}
      <div className="w-full lg:w-[420px] bg-card lg:border-l border-b lg:border-b-0 border-border overflow-y-auto order-1 lg:order-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b border-border p-0 h-auto bg-transparent flex-wrap">
            <TabsTrigger 
              value="search" 
              className="flex-1 min-w-[80px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-2 text-xs sm:text-sm"
            >
              <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Analysis
            </TabsTrigger>
            <TabsTrigger 
              value="compare" 
              className="flex-1 min-w-[80px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-2 text-xs sm:text-sm"
            >
              <GitCompare className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Compare
            </TabsTrigger>
            <TabsTrigger 
              value="timelapse" 
              className="flex-1 min-w-[80px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-2 text-xs sm:text-sm"
            >
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Time-Lapse
            </TabsTrigger>
            <TabsTrigger 
              value="import" 
              className="flex-1 min-w-[80px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-2 text-xs sm:text-sm"
            >
              <FileType className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              GIS Import
            </TabsTrigger>
            <TabsTrigger 
              value="upload" 
              className="flex-1 min-w-[80px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-2 text-xs sm:text-sm"
            >
              <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="flex-1 p-4 md:p-6 space-y-4 mt-0 overflow-y-auto">
            <div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Analysis Controls
              </h3>
              
              <div className="space-y-4">
                {/* Multi-Event Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <Label htmlFor="multi-event" className="text-sm font-medium">Multi-Event Analysis</Label>
                  </div>
                  <Switch
                    id="multi-event"
                    checked={isMultiEventMode}
                    onCheckedChange={setIsMultiEventMode}
                  />
                </div>

                {isMultiEventMode ? (
                  <MultiEventSelector
                    selectedEvents={selectedEventTypes}
                    onSelectionChange={setSelectedEventTypes}
                    maxSelection={5}
                  />
                ) : (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Event Type</label>
                    <Select value={eventType} onValueChange={setEventType}>
                      <SelectTrigger className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
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
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">Search Location</label>
                  <LocationSearch 
                    onLocationSelect={handleLocationSelect}
                    placeholder="Search any place in Africa..."
                    defaultValue={region}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Search for any city, town, district, region, or landmark
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectionMode(!selectionMode)}
                >
                  <MousePointer className="h-4 w-4 mr-2" />
                  {selectionMode ? "Cancel Selection" : "Select on Map"}
                </Button>

                {selectedLocation && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-primary">Selected Location:</p>
                    <p className="text-sm truncate">{selectedLocation.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                    </p>
                  </div>
                )}

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

                {/* Classification & Change Detection Controls */}
                <ClassificationControls
                  classificationType={classificationType}
                  onClassificationTypeChange={setClassificationType}
                  enableChangeDetection={enableChangeDetection}
                  onChangeDetectionToggle={setEnableChangeDetection}
                  numClasses={numClasses}
                  onNumClassesChange={setNumClasses}
                />

                <Button 
                  className="w-full bg-gradient-ocean hover:opacity-90"
                  onClick={runAnalysis}
                  disabled={isAnalyzing || (!region && !selectedLocation)}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing with Landsat...
                    </>
                  ) : (
                    <>
                      <Satellite className="h-4 w-4 mr-2" />
                      Run Landsat Analysis
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Saved Locations */}
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                  <span className="flex items-center gap-2 font-bold text-lg">
                    <Star className="h-5 w-5 text-primary" />
                    Watchlist
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <SavedLocations 
                  onLocationSelect={handleLocationSelect}
                  currentLocation={selectedLocation}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Results */}
            {results && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-lg">Analysis Results</h4>
                  {results.isMultiEvent && (
                    <Badge variant="secondary" className="text-xs">
                      <Layers className="h-3 w-3 mr-1" />
                      Multi-Event
                    </Badge>
                  )}
                </div>

                {/* Landsat Sensor Info */}
                {results.landsatInfo && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Satellite className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{results.landsatInfo.sensor || 'Landsat 8 OLI'}</span>
                      <Badge variant="outline" className="text-xs">{results.landsatInfo.spatial_resolution || '30m'}</Badge>
                    </div>
                    {results.landsatInfo.acquisition_dates && (
                      <p className="text-xs text-muted-foreground">
                        Acquisition: {results.landsatInfo.acquisition_dates.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Cloud Coverage & Quality Display */}
                <CloudCoverageDisplay
                  cloudCoverage={results.cloudCoverage?.percentage}
                  dataQuality={results.dataQuality?.overall_score}
                  analysisConfidence={results.analysisConfidence}
                  sensorType={results.landsatInfo?.sensor || results.sensorInfo?.primary_sensor}
                  acquisitionDate={results.landsatInfo?.acquisition_dates?.[0] || results.sensorInfo?.acquisition_dates?.[0]}
                />

                {/* Spectral Indices Display */}
                <SpectralIndicesDisplay
                  spectralIndices={results.spectralIndices}
                  landsatInfo={results.landsatInfo}
                />

                {/* Classification & Change Detection Results */}
                <ClassificationResults
                  classificationResults={results.classificationResults}
                  changeDetection={results.changeDetection}
                />

                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-destructive text-sm">
                      {results.severity === 'critical' ? 'Critical Impact' : 
                       results.severity === 'high' ? 'High Impact' : 
                       results.severity === 'medium' ? 'Moderate Impact' : 'Low Impact'} Detected
                    </p>
                    <p className="text-xs text-muted-foreground">Attention recommended</p>
                  </div>
                </div>

                {/* Multi-Event Results */}
                {results.multiEventAnalysis?.events && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Events Analyzed:</p>
                    {results.multiEventAnalysis.events.map((event: any, i: number) => (
                      <div key={i} className="p-2 bg-muted/30 rounded-md flex items-center justify-between">
                        <span className="text-sm capitalize">{event.event_type.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={event.severity === 'critical' ? 'destructive' : 
                                    event.severity === 'high' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {event.change_percent}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {results.multiEventAnalysis.combined_impact && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Combined Impact</p>
                        <p className="text-sm">{results.multiEventAnalysis.combined_impact}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Event</p>
                    <p className="font-semibold text-sm capitalize">
                      {results.isMultiEvent 
                        ? `${results.eventTypes?.length || 1} events`
                        : results.eventType?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Change</p>
                    <p className="font-bold text-xl text-destructive">{results.changePercent}%</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Area</p>
                  <p className="text-sm font-medium">{results.area}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Summary</p>
                  <p className="text-sm leading-relaxed">{results.summary}</p>
                </div>

                {/* Predictive Modeling */}
                {results.predictiveModeling && (
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Predictive Modeling</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Trend</p>
                        <p className="text-sm font-medium capitalize">{results.predictiveModeling.trend_direction}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">6-Month</p>
                        <p className="text-sm font-medium">{results.predictiveModeling.projected_change_6mo}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">12-Month</p>
                        <p className="text-sm font-medium">{results.predictiveModeling.projected_change_12mo}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {results.fullAnalysis && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Detailed Analysis</p>
                    <div className="text-sm leading-relaxed max-h-40 overflow-y-auto bg-muted/30 p-3 rounded-lg">
                      {results.fullAnalysis}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <ReportGenerator 
                    analysisData={results} 
                    eventType={results.isMultiEvent ? results.eventTypes?.join(', ') : eventType}
                    region={region || selectedLocation?.name}
                  />
                  <GISExportButton
                    features={[{
                      id: results.id || crypto.randomUUID(),
                      name: region || selectedLocation?.name || "Unknown",
                      coordinates: selectedLocation || { lat: mapCenter[0], lng: mapCenter[1] },
                      eventType: results.eventType || eventType,
                      changePercent: results.changePercent,
                      startDate: startDate,
                      endDate: endDate,
                      summary: results.summary,
                      areaAnalyzed: results.area,
                      createdAt: new Date().toISOString(),
                    } as AnalysisFeature]}
                    filename={`geopulse-${eventType}-${region?.replace(/[^a-zA-Z0-9]/g, "_") || "analysis"}`}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare" className="flex-1 p-4 md:p-6 mt-0 overflow-y-auto">
            <ComparisonMode 
              onComparisonComplete={(result) => {
                if (result?.location) {
                  toast.success("Comparison analysis displayed on map");
                }
              }}
            />
          </TabsContent>

          <TabsContent value="timelapse" className="flex-1 p-4 md:p-6 mt-0 overflow-y-auto">
            <TimeLapseAnimation 
              onFrameChange={(frame) => {
                console.log("Frame changed:", frame);
              }}
              mapCenter={mapCenter}
            />
          </TabsContent>

          <TabsContent value="import" className="flex-1 p-4 md:p-6 mt-0 overflow-y-auto">
            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileType className="h-5 w-5 text-primary" />
                Import GIS Data
              </h3>
              <p className="text-sm text-muted-foreground">
                Import Shapefiles (.shp) or GeoJSON files for analysis. 
                Compatible with QGIS, ArcGIS, and other GIS applications.
              </p>
              <ShapefileImport onImport={handleShapefileImport} />
              
              {importedFeatures.length > 0 && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium text-primary mb-2">
                    {importedFeatures.length} features loaded
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <GISExportButton
                      features={importedFeatures}
                      filename="geopulse-imported"
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 p-4 md:p-6 mt-0 overflow-y-auto">
            <FileUploadAnalysis />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default GeoWitness;
