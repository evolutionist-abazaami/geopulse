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
    const { files, reportType } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`Analyzing ${files.length} files with report type: ${reportType}`);

    // Prepare file descriptions for AI
    const fileDescriptions = files.map((f: any) => ({
      name: f.name,
      type: f.type,
      size: `${(f.size / 1024).toFixed(1)} KB`,
    }));

    // For images, we'll use the vision capability
    const imageFiles = files.filter((f: any) => f.type.startsWith("image/"));
    const dataFiles = files.filter((f: any) => !f.type.startsWith("image/"));

    const isSimple = reportType === "simple";

    const systemPrompt = `You are an expert environmental scientist and geospatial analyst. 
You analyze satellite imagery, environmental data, and geospatial files to provide comprehensive environmental assessments.

${isSimple ? `
IMPORTANT: Generate a SIMPLE, easy-to-understand report that anyone can understand.
- Use plain language, avoid technical jargon
- Explain findings as if talking to a community member
- Focus on practical implications
- Keep explanations short and clear
` : `
IMPORTANT: Generate a PROFESSIONAL technical report suitable for scientists and policymakers.
- Use proper scientific terminology
- Include detailed methodology references
- Provide quantitative metrics where possible
- Reference standard environmental indices (NDVI, NDWI, etc.)
`}

Return your analysis as JSON with this structure:
{
  "summary": "Overall summary of findings",
  "findings": ["finding 1", "finding 2", ...],
  "detailedAnalysis": "Full detailed analysis text",
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "confidenceLevel": number (1-100),
  "dataSources": ["source 1", "source 2", ...],
  "methodology": "Brief methodology description",
  "severity": "low|medium|high|critical"
}`;

    // Build messages array
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // If there are image files, include them in the message
    if (imageFiles.length > 0) {
      const content: any[] = [
        { 
          type: "text", 
          text: `Analyze these environmental/geospatial files for environmental changes and patterns:

Files being analyzed:
${fileDescriptions.map((f: any) => `- ${f.name} (${f.type}, ${f.size})`).join('\n')}

Please provide a comprehensive ${isSimple ? 'simple, easy-to-understand' : 'professional technical'} analysis.`
        }
      ];

      // Add images (limit to first 3 for API limits)
      for (const img of imageFiles.slice(0, 3)) {
        content.push({
          type: "image_url",
          image_url: { url: img.data }
        });
      }

      messages.push({ role: "user", content });
    } else {
      // Text/data files only
      messages.push({
        role: "user",
        content: `Analyze these environmental/geospatial data files:

Files being analyzed:
${fileDescriptions.map((f: any) => `- ${f.name} (${f.type}, ${f.size})`).join('\n')}

${dataFiles.length > 0 ? `Sample data from first file: ${dataFiles[0].data.substring(0, 500)}...` : ''}

Please provide a comprehensive ${isSimple ? 'simple, easy-to-understand' : 'professional technical'} environmental analysis based on typical patterns and implications of this type of data.`
      });
    }

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
      parsedAnalysis = {
        summary: analysis.split('\n\n')[0] || "Analysis complete",
        findings: [],
        detailedAnalysis: analysis,
        recommendations: [],
        confidenceLevel: 80,
        dataSources: ["Uploaded files"],
        methodology: "AI-powered file analysis",
        severity: "medium"
      };
    }

    const result = {
      ...parsedAnalysis,
      filesAnalyzed: fileDescriptions,
      reportType,
      timestamp: new Date().toISOString(),
    };

    // Optionally store in database
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

      // Store as a search query for now
      await supabase.from("search_queries").insert({
        user_id: userId,
        query: `File analysis: ${fileDescriptions.map((f: any) => f.name).join(', ')}`,
        ai_interpretation: result.summary,
        results: {
          findings: result.findings,
          recommendations: result.recommendations,
          filesAnalyzed: fileDescriptions,
        },
        confidence_level: result.confidenceLevel,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-files:", error);
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
