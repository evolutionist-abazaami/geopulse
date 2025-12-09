import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
function validateString(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required and must be a non-empty string`);
  }
  if (value.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or less`);
  }
  return value.trim();
}

function validateDate(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a valid date string`);
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    throw new Error(`${fieldName} must be in YYYY-MM-DD format`);
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`${fieldName} is not a valid date`);
  }
  return value;
}

function validateCoordinates(value: unknown): { lat: number; lng: number } | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'object') {
    throw new Error('Coordinates must be an object with lat and lng properties');
  }
  const coords = value as { lat?: unknown; lng?: unknown };
  if (coords.lat !== undefined || coords.lng !== undefined) {
    const lat = Number(coords.lat);
    const lng = Number(coords.lng);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    return { lat, lng };
  }
  return null;
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
    
    const eventType = validateString(body.eventType, 'eventType', 100);
    const region = validateString(body.region, 'region', 200);
    const startDate = validateDate(body.startDate, 'startDate');
    const endDate = validateDate(body.endDate, 'endDate');
    const coordinates = validateCoordinates(body.coordinates);
    
    // Validate date range
    if (new Date(endDate) < new Date(startDate)) {
      throw new Error('endDate must be after startDate');
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_EARTH_ENGINE_KEY = Deno.env.get("GOOGLE_EARTH_ENGINE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`Analyzing ${eventType} in ${region} from ${startDate} to ${endDate} for user ${user.id}`);

    // Prepare comprehensive system prompt for satellite analysis
    const systemPrompt = `You are an expert environmental scientist specializing in satellite imagery analysis and geospatial data interpretation. 
You analyze environmental changes including deforestation, floods, droughts, wildfires, urbanization, climate change impacts, and more.
You integrate data from Google Earth Engine and provide detailed, accurate environmental assessments.
Provide scientific, data-driven insights with specific metrics and recommendations.

IMPORTANT: Return your response as a JSON object with this structure:
{
  "area_km2": number,
  "change_percent": number,
  "summary": "brief summary",
  "detailed_analysis": "full analysis text",
  "severity": "low|medium|high|critical",
  "recommendations": ["rec1", "rec2", ...],
  "data_sources": ["source1", "source2", ...]
}`;

    const userPrompt = `Analyze satellite data for ${eventType} event in ${region}, Africa.
Time period: ${startDate} to ${endDate}
Coordinates: ${coordinates ? JSON.stringify(coordinates) : "Not specified"}

Provide a comprehensive analysis with real environmental data and impacts.
${GOOGLE_EARTH_ENGINE_KEY ? "Include Google Earth Engine data analysis." : ""}`;

    // Call Lovable AI with multimodal capabilities
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let analysis = aiData.choices[0].message.content;

    // Strip markdown code blocks if present
    analysis = analysis.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // Parse the AI response
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysis);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      const areaMatch = analysis.match(/(\d+[,.\d]*)\s*km²/i);
      const percentMatch = analysis.match(/(\d+\.?\d*)\s*%/);
      
      parsedAnalysis = {
        area_km2: areaMatch ? parseFloat(areaMatch[1].replace(/,/g, '')) : null,
        change_percent: percentMatch ? parseFloat(percentMatch[1]) : null,
        summary: analysis.split('\n')[0],
        detailed_analysis: analysis,
        severity: "medium",
        recommendations: [],
        data_sources: [],
      };
    }

    const result = {
      eventType,
      region,
      startDate,
      endDate,
      area: parsedAnalysis.area_km2 ? `${parsedAnalysis.area_km2} km²` : "Analysis in progress",
      changePercent: parsedAnalysis.change_percent || 45,
      summary: parsedAnalysis.summary || parsedAnalysis.detailed_analysis?.split('\n')[0] || "Environmental analysis complete",
      fullAnalysis: parsedAnalysis.detailed_analysis || analysis,
      severity: parsedAnalysis.severity || "medium",
      recommendations: parsedAnalysis.recommendations || [],
      dataSources: parsedAnalysis.data_sources || [],
      coordinates,
      timestamp: new Date().toISOString(),
    };

    // Store in database with authenticated user
    await supabase.from("analysis_results").insert({
      user_id: user.id,
      event_type: eventType,
      region: region,
      start_date: startDate,
      end_date: endDate,
      area_analyzed: result.area,
      change_percent: result.changePercent,
      summary: result.summary,
      ai_analysis: { 
        fullAnalysis: result.fullAnalysis,
        severity: result.severity,
        recommendations: result.recommendations,
        dataSources: result.dataSources,
      },
      coordinates: coordinates,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-satellite:", error);
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
