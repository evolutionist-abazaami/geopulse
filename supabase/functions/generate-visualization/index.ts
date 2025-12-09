import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
const ALLOWED_VISUALIZATION_TYPES = ['map', 'chart', 'heatmap', 'comparison', 'infographic'];

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
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    const body = await req.json();
    
    const visualizationType = validateVisualizationType(body.visualizationType);
    const region = validateString(body.region, 'region', 200) || 'Africa';
    const eventType = validateString(body.eventType, 'eventType', 100) || 'environmental changes';
    // data is optional and not directly used in prompts, so we just validate it exists if provided
    if (body.data !== undefined && typeof body.data !== 'object') {
      throw new Error('Data must be an object if provided');
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`Generating ${visualizationType} visualization for ${region} for user ${user.id}`);

    // Create detailed prompt based on visualization type
    let prompt = "";
    switch (visualizationType) {
      case "map":
        prompt = `Create a professional satellite map visualization showing ${eventType} in ${region}. Show affected areas highlighted in red/orange, with a clean legend, scale bar, and north arrow. The map should have a topographic style with clear terrain features. Ultra high resolution, professional cartographic style, scientific visualization. 16:9 aspect ratio.`;
        break;
      case "chart":
        prompt = `Create a professional data visualization chart showing ${eventType} trends over time for ${region}. Include a line graph with percentage change on Y-axis and years on X-axis. Use blue and orange color scheme, clean modern design with gridlines, proper axis labels, and a title. Professional scientific chart style. 16:9 aspect ratio.`;
        break;
      case "heatmap":
        prompt = `Create a professional heatmap visualization showing the intensity of ${eventType} across ${region}. Use a gradient from green (low) through yellow to red (high intensity). Include a legend showing intensity scale, clean borders, and geographic labels. Scientific visualization style. 16:9 aspect ratio.`;
        break;
      case "comparison":
        prompt = `Create a professional before/after satellite comparison visualization for ${region} showing ${eventType}. Split view with "Before" on left and "After" on right, with clear labels, date markers, and highlighted change areas. Professional remote sensing visualization style. 16:9 aspect ratio.`;
        break;
      default:
        prompt = `Create a professional environmental analysis infographic for ${region} showing ${eventType}. Include charts, maps, and key statistics in a clean, modern design. Professional scientific poster style. 16:9 aspect ratio.`;
    }

    // Call Lovable AI image generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
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
        visualizationType
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
