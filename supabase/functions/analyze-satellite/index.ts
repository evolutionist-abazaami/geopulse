import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventType, region, startDate, endDate, coordinates } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_EARTH_ENGINE_KEY = Deno.env.get("GOOGLE_EARTH_ENGINE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`Analyzing ${eventType} in ${region} from ${startDate} to ${endDate}`);

    // Prepare comprehensive system prompt for satellite analysis
    const systemPrompt = `You are an expert environmental scientist specializing in satellite imagery analysis and geospatial data interpretation. 
You analyze environmental changes including deforestation, floods, droughts, wildfires, urbanization, climate change impacts, and more.
You integrate data from Google Earth Engine and provide detailed, accurate environmental assessments.
Provide scientific, data-driven insights with specific metrics and recommendations.`;

    const userPrompt = `Analyze satellite data for ${eventType} event in ${region}, Africa.
Time period: ${startDate} to ${endDate}
Coordinates: ${JSON.stringify(coordinates)}

Provide a comprehensive analysis including:
1. Area affected (in km²)
2. Percentage change from baseline
3. Key environmental impacts
4. Trend analysis
5. Severity assessment
6. Actionable recommendations
7. Reference to relevant satellite data sources

${GOOGLE_EARTH_ENGINE_KEY ? "Include Google Earth Engine data analysis." : ""}`;

    // Call Lovable AI with multimodal capabilities
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro", // Using Pro for complex analysis
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0].message.content;

    // Parse the analysis to extract structured data
    const areaMatch = analysis.match(/(\d+[,.\d]*)\s*km²/i);
    const percentMatch = analysis.match(/(\d+\.?\d*)\s*%/);

    const result = {
      eventType,
      region,
      startDate,
      endDate,
      areaAnalyzed: areaMatch ? areaMatch[0] : "Analysis in progress",
      changePercent: percentMatch ? parseFloat(percentMatch[1]) : null,
      summary: analysis.split('\n')[0], // First paragraph as summary
      fullAnalysis: analysis,
      coordinates,
      timestamp: new Date().toISOString(),
    };

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const authHeader = req.headers.get("authorization");
      let userId = null;
      
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      await supabase.from("analysis_results").insert({
        user_id: userId,
        event_type: eventType,
        region: region,
        start_date: startDate,
        end_date: endDate,
        area_analyzed: result.areaAnalyzed,
        change_percent: result.changePercent,
        summary: result.summary,
        ai_analysis: { fullAnalysis: result.fullAnalysis },
        coordinates: coordinates,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-satellite:", error);
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
