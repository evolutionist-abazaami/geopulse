import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Layers } from "lucide-react";

interface EventType {
  value: string;
  label: string;
  icon: string;
  category: string;
}

const eventCategories: Record<string, EventType[]> = {
  "Vegetation & Forest": [
    { value: "deforestation", label: "Deforestation", icon: "🌳", category: "Vegetation & Forest" },
    { value: "forest_degradation", label: "Forest Degradation", icon: "🌲", category: "Vegetation & Forest" },
    { value: "reforestation", label: "Reforestation", icon: "🌱", category: "Vegetation & Forest" },
    { value: "vegetation_loss", label: "Vegetation Loss", icon: "🍃", category: "Vegetation & Forest" },
    { value: "mangrove_loss", label: "Mangrove Loss", icon: "🌿", category: "Vegetation & Forest" },
  ],
  "Water-related": [
    { value: "flood", label: "Flood", icon: "🌊", category: "Water-related" },
    { value: "drought", label: "Drought", icon: "🏜️", category: "Water-related" },
    { value: "rainfall", label: "Rainfall Patterns", icon: "🌧️", category: "Water-related" },
    { value: "water_scarcity", label: "Water Scarcity", icon: "💧", category: "Water-related" },
    { value: "lake_drying", label: "Lake Drying", icon: "🏞️", category: "Water-related" },
    { value: "coastal_erosion", label: "Coastal Erosion", icon: "🏖️", category: "Water-related" },
  ],
  "Fire & Disasters": [
    { value: "wildfire", label: "Wildfire", icon: "🔥", category: "Fire & Disasters" },
    { value: "bushfire", label: "Bushfire", icon: "🔥", category: "Fire & Disasters" },
    { value: "cyclone", label: "Cyclone/Hurricane", icon: "🌀", category: "Fire & Disasters" },
    { value: "storm", label: "Storm Activity", icon: "⛈️", category: "Fire & Disasters" },
  ],
  "Land & Climate": [
    { value: "desertification", label: "Desertification", icon: "🏜️", category: "Land & Climate" },
    { value: "soil_erosion", label: "Soil Erosion", icon: "⛰️", category: "Land & Climate" },
    { value: "climate_change", label: "Climate Impact", icon: "🌡️", category: "Land & Climate" },
    { value: "urbanization", label: "Urbanization", icon: "🏙️", category: "Land & Climate" },
    { value: "mining", label: "Mining Activity", icon: "⛏️", category: "Land & Climate" },
  ],
};

interface MultiEventSelectorProps {
  selectedEvents: string[];
  onSelectionChange: (events: string[]) => void;
  maxSelection?: number;
}

const MultiEventSelector = ({ 
  selectedEvents, 
  onSelectionChange,
  maxSelection = 5
}: MultiEventSelectorProps) => {
  const [openCategories, setOpenCategories] = useState<string[]>(["Vegetation & Forest"]);

  const toggleEvent = (eventValue: string) => {
    if (selectedEvents.includes(eventValue)) {
      onSelectionChange(selectedEvents.filter(e => e !== eventValue));
    } else if (selectedEvents.length < maxSelection) {
      onSelectionChange([...selectedEvents, eventValue]);
    }
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getEventLabel = (value: string): string => {
    for (const events of Object.values(eventCategories)) {
      const event = events.find(e => e.value === value);
      if (event) return event.label;
    }
    return value;
  };

  const getEventIcon = (value: string): string => {
    for (const events of Object.values(eventCategories)) {
      const event = events.find(e => e.value === value);
      if (event) return event.icon;
    }
    return "📍";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Multi-Event Analysis
        </Label>
        <Badge variant="outline" className="text-xs">
          {selectedEvents.length}/{maxSelection} selected
        </Badge>
      </div>

      {selectedEvents.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg">
          {selectedEvents.map(event => (
            <Badge 
              key={event} 
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/20 transition-colors text-xs"
              onClick={() => toggleEvent(event)}
            >
              <span className="mr-1">{getEventIcon(event)}</span>
              {getEventLabel(event)}
              <span className="ml-1.5 text-muted-foreground">×</span>
            </Badge>
          ))}
        </div>
      )}

      <div className="border rounded-lg divide-y max-h-[280px] overflow-y-auto">
        {Object.entries(eventCategories).map(([category, events]) => (
          <Collapsible 
            key={category}
            open={openCategories.includes(category)}
            onOpenChange={() => toggleCategory(category)}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between px-3 py-2 h-auto font-medium text-sm hover:bg-muted/50"
              >
                <span>{category}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openCategories.includes(category) ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-2">
              <div className="grid grid-cols-1 gap-1">
                {events.map(event => (
                  <div 
                    key={event.value}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                      selectedEvents.includes(event.value) 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleEvent(event.value)}
                  >
                    <Checkbox 
                      checked={selectedEvents.includes(event.value)}
                      disabled={!selectedEvents.includes(event.value) && selectedEvents.length >= maxSelection}
                      className="pointer-events-none"
                    />
                    <span className="text-base">{event.icon}</span>
                    <span className="text-sm">{event.label}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {selectedEvents.length >= maxSelection && (
        <p className="text-xs text-muted-foreground">
          Maximum {maxSelection} events can be analyzed together
        </p>
      )}
    </div>
  );
};

export default MultiEventSelector;
