import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, topic, category, mood, constraints, parentIdea } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "expand") {
      systemPrompt = "You are a creative idea expansion engine. Given an existing idea, generate 3-4 variations, sub-ideas, or deeper explorations of the concept. Be creative and diverse.";
      userPrompt = `Expand on this idea: "${parentIdea}"${category ? ` (Category: ${category})` : ""}${mood ? ` (Tone: ${mood})` : ""}`;
    } else {
      systemPrompt = "You are a creative concept engine. Generate 4-5 unique, compelling ideas based on the user's input. Each idea should be distinct and creative. Be bold and imaginative.";
      userPrompt = `Topic: ${topic}${category ? `\nCategory/Industry: ${category}` : ""}${mood ? `\nMood/Tone: ${mood}` : ""}${constraints ? `\nConstraints: ${constraints}` : ""}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_ideas",
              description: "Return generated creative ideas",
              parameters: {
                type: "object",
                properties: {
                  ideas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short catchy title for the idea" },
                        description: { type: "string", description: "2-3 sentence description of the concept" },
                        tags: { type: "array", items: { type: "string" }, description: "2-3 relevant tags" },
                      },
                      required: ["title", "description", "tags"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["ideas"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_ideas" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const ideas = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(ideas), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ideas error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
