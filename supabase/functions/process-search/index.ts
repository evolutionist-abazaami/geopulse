import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helper
function validateQuery(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Query is required and must be a non-empty string');
  }
  if (value.length > 1000) {
    throw new Error('Query must be 1000 characters or less');
  }
  return value.trim();
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
    const query = validateQuery(body.query);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`Processing search query for user ${user.id}: ${query.substring(0, 100)}...`);

    // Prepare system prompt for natural language search
    const systemPrompt = `You are an AI assistant specialized in geospatial search and environmental data interpretation.
Your role is to:
1. Interpret natural language queries about environmental changes across Africa
2. Extract key information: location, event type, time period, specific concerns
3. Provide relevant satellite data insights with REAL coordinates
4. Suggest monitoring strategies and data sources
5. Assess confidence levels based on data availability

Format responses as structured JSON with:
- interpretation: Clear explanation of what the user is looking for
- findings: Array of relevant environmental insights
- locations: Array of location objects with {name: string, lat: number, lng: number, boundary?: [[lat,lng][]]}
- confidenceLevel: 1-100 scale
- recommendations: Actionable next steps

IMPORTANT: Always provide real geographic coordinates for locations mentioned in Africa.`;

    const userPrompt = `Interpret this environmental search query: "${query}"

Provide insights about environmental changes in African regions, including deforestation, flooding, drought, urbanization, or climate impacts.
Consider satellite data availability and relevance.`;

    // Call Lovable AI
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
        temperature: 0.6,
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
    let interpretation = aiData.choices[0].message.content;

    // Strip markdown code blocks if present
    interpretation = interpretation.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // Try to parse as JSON if structured, otherwise use as text
    let structuredResult;
    try {
      structuredResult = JSON.parse(interpretation);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      structuredResult = {
        interpretation: interpretation.split('\n\n')[0],
        findings: interpretation.split('\n').filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•')),
        locations: [],
        confidenceLevel: 75,
        recommendations: [],
      };
    }

    const result = {
      query,
      interpretation: structuredResult.interpretation || interpretation,
      findings: structuredResult.findings || [],
      locations: structuredResult.locations || [],
      confidenceLevel: structuredResult.confidenceLevel || 85,
      recommendations: structuredResult.recommendations || [],
      timestamp: new Date().toISOString(),
    };

    // Store in database with authenticated user
    await supabase.from("search_queries").insert({
      user_id: user.id,
      query: query,
      ai_interpretation: result.interpretation,
      results: {
        findings: result.findings,
        locations: result.locations,
        recommendations: result.recommendations,
      },
      confidence_level: result.confidenceLevel,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in process-search:", error);
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
