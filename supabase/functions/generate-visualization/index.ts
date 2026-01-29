import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
const ALLOWED_VISUALIZATION_TYPES = ['map', 'chart', 'heatmap', 'comparison', 'infographic', 'satellite_2d', 'satellite_3d', 'satellite_4d', 'predictive', 'timeline'];

function validateString(value: unknown, fieldName: string, maxLength: number, required = false): string | null {
  if (value === undefined || value === null) {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  if (value.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or less`);
  }
  return value.trim();
}

function validateVisualizationType(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Visualization type is required');
  }
  const normalized = value.toLowerCase().trim();
  if (!ALLOWED_VISUALIZATION_TYPES.includes(normalized)) {
    throw new Error(`Visualization type must be one of: ${ALLOWED_VISUALIZATION_TYPES.join(', ')}`);
  }
  return normalized;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication first
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Database configuration missing");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const authHeader = req.headers.get("authorization");
    
    // Allow unauthenticated access for visualization generation
    let user = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token && !token.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6")) {
        const { data } = await supabase.auth.getUser(token);
        user = data?.user || null;
      }
    }

    // Parse and validate input
    const body = await req.json();
    
    const visualizationType = validateVisualizationType(body.visualizationType);
    const region = validateString(body.region, 'region', 200) || 'Africa';
    const eventType = validateString(body.eventType, 'eventType', 100) || 'environmental changes';
    const changePercent = body.changePercent || body.data?.changePercent || 0;
    const severity = body.severity || body.data?.severity || 'medium';
    
    // Extract predictive data if available
    const predictiveData = body.predictiveModeling || body.data?.predictiveModeling;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`Generating ${visualizationType} visualization for ${region} - User: ${user?.id || 'anonymous'}`);

    // Enhanced prompts for realistic satellite imagery
    let prompt = "";
    switch (visualizationType) {
      case "satellite_2d":
        prompt = `Create a hyper-realistic 2D satellite imagery view of ${region}, Africa showing ${eventType}. 
Photorealistic Sentinel-2 style satellite image with true color composite (RGB bands). 
Show affected areas with subtle color differences indicating ${Math.abs(changePercent)}% ${eventType} change.
Include: Cloud-free imagery, sharp terrain features, visible infrastructure, river systems, vegetation patterns.
${severity === 'critical' ? 'Show dramatic visible damage/change in affected zones.' : ''}
Professional cartographic quality with north arrow and scale bar. 
Ultra high resolution, 16:9 aspect ratio, photorealistic satellite imagery style.`;
        break;
        
      case "satellite_3d":
        prompt = `Create a stunning 3D terrain visualization of ${region}, Africa showing ${eventType} impacts.
Oblique 3D perspective view with realistic terrain elevation from SRTM DEM data.
Show topographic features: mountains, valleys, river basins, coastlines with dramatic shadows.
Overlay ${eventType} impact data as semi-transparent color gradation (green-yellow-red intensity).
${changePercent > 20 ? 'Highlight critical change areas with glowing boundaries.' : ''}
Include: 3D vegetation representation, atmospheric haze for depth, realistic lighting.
Professional 3D GIS visualization style, ultra high resolution, 16:9 aspect ratio.`;
        break;
        
      case "satellite_4d":
        prompt = `Create a temporal 4D visualization showing ${eventType} change over time in ${region}, Africa.
Split-panel or animated sequence style showing BEFORE and AFTER satellite imagery.
Left panel: "2022" with original conditions - lush vegetation/normal state.
Right panel: "2024" with ${Math.abs(changePercent)}% ${eventType} change visible.
Include dramatic visual difference highlighting environmental transformation.
Add temporal annotations, timeline indicator, and change detection overlay.
${predictiveData ? `Show projected future state for 2025 with ${predictiveData.projected_change_12mo}% additional change.` : ''}
Professional time-series analysis style, photorealistic, 16:9 aspect ratio.`;
        break;
        
      case "predictive":
        prompt = `Create a predictive modeling visualization for ${eventType} in ${region}, Africa.
Show projected environmental changes over the next 12 months.
Include: Current state indicator, trend arrows, confidence bands, projection zones.
Use gradient colors from current (blue) through projected (orange/red for decline, green for improvement).
${predictiveData ? `Trend: ${predictiveData.trend_direction}, 6-month projection: ${predictiveData.projected_change_6mo}%, 12-month projection: ${predictiveData.projected_change_12mo}%` : ''}
Add predictive heat zones showing high-probability change areas.
Professional scientific forecasting visualization, 16:9 aspect ratio.`;
        break;
        
      case "timeline":
        prompt = `Create an animated timeline visualization showing ${eventType} progression in ${region}, Africa.
Circular or linear timeline design showing yearly changes from 2020-2025.
Each time point shows satellite snapshot with change percentage overlay.
Progressive color shift from green (healthy) through yellow to red (critical) based on degradation.
Include: Timeline markers, percentage annotations, trend line, key event callouts.
Professional animated infographic style, 16:9 aspect ratio.`;
        break;

      case "map":
        prompt = `Create a professional satellite map visualization showing ${eventType} in ${region}, Africa. 
Photorealistic satellite basemap with affected areas highlighted in red/orange heat overlay.
Include: Clean legend, scale bar, north arrow, coordinate grid.
Topographic style with clear terrain features, river networks, urban areas marked.
Show ${Math.abs(changePercent)}% change with intensity-based coloring.
Ultra high resolution, professional cartographic style, 16:9 aspect ratio.`;
        break;
        
      case "chart":
        prompt = `Create a professional data visualization chart showing ${eventType} trends over time for ${region}.
Modern line graph with percentage change on Y-axis (-50% to +50%) and years 2020-2025 on X-axis.
Use gradient blue-to-red color scheme based on severity.
Include: Clean gridlines, proper axis labels, data points with values, trend line, projection zone.
Add confidence interval shading and annotation for key events.
Professional scientific chart style, 16:9 aspect ratio.`;
        break;
        
      case "heatmap":
        prompt = `Create a professional heatmap visualization showing intensity of ${eventType} across ${region}, Africa.
Geographic heatmap with gradient: Dark green (low impact) → Yellow → Orange → Dark red (high impact).
Include: Clear legend showing intensity scale (0-100%), geographic labels, regional boundaries.
Overlay on subtle satellite basemap for geographic context.
Show hotspots and clusters of ${eventType} activity.
Scientific visualization style, 16:9 aspect ratio.`;
        break;
        
      case "comparison":
        prompt = `Create a professional before/after satellite comparison for ${region} showing ${eventType}.
Clean split-view: "BEFORE (2022)" on left, "AFTER (2024)" on right.
Photorealistic satellite imagery style for both panels.
Highlight changed areas with subtle boundary outlines.
Include: Date labels, change percentage overlay (${Math.abs(changePercent)}%), scale bar.
${severity === 'critical' ? 'Dramatic visible transformation between panels.' : 'Subtle but detectable differences.'}
Professional remote sensing visualization, 16:9 aspect ratio.`;
        break;
        
      default:
        prompt = `Create a professional environmental analysis infographic for ${region} showing ${eventType}.
Include: Satellite imagery section, key statistics (${Math.abs(changePercent)}% change), trend chart, recommendations.
Clean, modern design with data visualization elements.
Professional scientific poster style, 16:9 aspect ratio.`;
    }

    // Use higher quality model for satellite imagery
    const model = ['satellite_2d', 'satellite_3d', 'satellite_4d', 'predictive'].includes(visualizationType)
      ? "google/gemini-3-pro-image-preview"
      : "google/gemini-2.5-flash-image-preview";

    // Call Lovable AI image generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    
    // Extract image from response
    const message = aiData.choices?.[0]?.message;
    const images = message?.images || [];
    
    if (images.length === 0) {
      console.log("No images generated, returning placeholder");
      return new Response(
        JSON.stringify({ 
          success: true,
          imageUrl: null,
          description: message?.content || "Visualization generated",
          visualizationType
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageUrl = images[0]?.image_url?.url;

    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl,
        description: message?.content || "Visualization generated successfully",
        visualizationType,
        model
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-visualization:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const status = errorMessage.includes("required") || errorMessage.includes("must be") ? 400 : 500;
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
