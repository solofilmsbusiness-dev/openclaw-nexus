import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HEYGEN_BASE = "https://api.heygen.com";

const DEFAULT_AVATAR_ID = "Angela-inblackskirt-20220820";
const DEFAULT_VOICE_ID = "2d5b0e6cf36f460aa7fc47e3eee4ba54";

interface Scene {
  html?: string;
  script?: string;
  duration?: number;
  avatarId?: string;
  voiceId?: string;
}

function heygenHeaders(apiKey: string) {
  return {
    "X-Api-Key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function sceneToVideoInput(scene: Scene) {
  return {
    character: {
      type: "avatar",
      avatar_id: scene.avatarId || DEFAULT_AVATAR_ID,
      avatar_style: "normal",
    },
    voice: {
      type: "text",
      input_text: scene.script || "Hello from HyperFrames!",
      voice_id: scene.voiceId || DEFAULT_VOICE_ID,
    },
    background: scene.html
      ? { type: "html", html: scene.html }
      : { type: "color", value: "#0a0a0f" },
    ...(scene.duration ? { duration: scene.duration } : {}),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return new Response(JSON.stringify({ error: "apiKey is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!action || typeof action !== "string") {
      return new Response(JSON.stringify({ error: "action is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "test_connection": {
        const res = await fetch(`${HEYGEN_BASE}/v2/user/remaining_quota`, {
          headers: heygenHeaders(apiKey),
        });
        if (!res.ok) {
          const text = await res.text();
          return new Response(
            JSON.stringify({ error: `HeyGen API error ${res.status}: ${text}` }),
            { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_avatars": {
        const res = await fetch(`${HEYGEN_BASE}/v2/avatars`, {
          headers: heygenHeaders(apiKey),
        });
        if (!res.ok) {
          const text = await res.text();
          return new Response(
            JSON.stringify({ error: `HeyGen API error ${res.status}: ${text}` }),
            { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate_video": {
        const { title, scenes, width, height } = body as {
          title?: string;
          scenes?: Scene[];
          width?: number;
          height?: number;
        };

        const sceneList: Scene[] = scenes && scenes.length > 0
          ? scenes
          : [{ html: body.backgroundHtml, script: body.script }];

        const videoPayload = {
          video_inputs: sceneList.map(sceneToVideoInput),
          dimension: { width: width || 1280, height: height || 720 },
          title: title || "HyperFrames Video",
        };

        const res = await fetch(`${HEYGEN_BASE}/v2/video/generate`, {
          method: "POST",
          headers: heygenHeaders(apiKey),
          body: JSON.stringify(videoPayload),
        });

        if (!res.ok) {
          const text = await res.text();
          return new Response(
            JSON.stringify({ error: `HeyGen API error ${res.status}: ${text}` }),
            { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "check_video_status": {
        const { videoId } = body;
        if (!videoId) {
          return new Response(JSON.stringify({ error: "videoId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const res = await fetch(
          `${HEYGEN_BASE}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
          { headers: heygenHeaders(apiKey) },
        );
        if (!res.ok) {
          const text = await res.text();
          return new Response(
            JSON.stringify({ error: `HeyGen API error ${res.status}: ${text}` }),
            { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    console.error("heygen-proxy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
