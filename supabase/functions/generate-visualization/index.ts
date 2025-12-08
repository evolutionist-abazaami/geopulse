import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visualizationType, data, region, eventType } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`Generating ${visualizationType} visualization for ${region}`);

    // Create detailed prompt based on visualization type
    let prompt = "";
    switch (visualizationType) {
      case "map":
        prompt = `Create a professional satellite map visualization showing ${eventType || "environmental changes"} in ${region || "Africa"}. Show affected areas highlighted in red/orange, with a clean legend, scale bar, and north arrow. The map should have a topographic style with clear terrain features. Ultra high resolution, professional cartographic style, scientific visualization. 16:9 aspect ratio.`;
        break;
      case "chart":
        prompt = `Create a professional data visualization chart showing ${eventType || "environmental"} trends over time for ${region || "African region"}. Include a line graph with percentage change on Y-axis and years on X-axis. Use blue and orange color scheme, clean modern design with gridlines, proper axis labels, and a title. Professional scientific chart style. 16:9 aspect ratio.`;
        break;
      case "heatmap":
        prompt = `Create a professional heatmap visualization showing the intensity of ${eventType || "environmental impact"} across ${region || "Africa"}. Use a gradient from green (low) through yellow to red (high intensity). Include a legend showing intensity scale, clean borders, and geographic labels. Scientific visualization style. 16:9 aspect ratio.`;
        break;
      case "comparison":
        prompt = `Create a professional before/after satellite comparison visualization for ${region || "Africa"} showing ${eventType || "environmental changes"}. Split view with "Before" on left and "After" on right, with clear labels, date markers, and highlighted change areas. Professional remote sensing visualization style. 16:9 aspect ratio.`;
        break;
      default:
        prompt = `Create a professional environmental analysis infographic for ${region || "Africa"} showing ${eventType || "environmental data"}. Include charts, maps, and key statistics in a clean, modern design. Professional scientific poster style. 16:9 aspect ratio.`;
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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
