import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type AnalysisType = "image" | "video" | "fakenews" | "emotion" | "webcam";

interface AnalyzePayload {
  type: AnalysisType;
  // For image / emotion / webcam: single image data URL or https url
  imageUrl?: string;
  // For video: array of frame image data URLs sampled from the clip
  frames?: string[];
  // For fakenews: text content (or text extracted from URL by client)
  text?: string;
  sourceUrl?: string;
}

function buildSchemaTool(type: AnalysisType) {
  if (type === "fakenews") {
    return {
      type: "function",
      function: {
        name: "report_fakenews",
        description: "Report whether the news content is real, fake, or uncertain.",
        parameters: {
          type: "object",
          properties: {
            verdict: { type: "string", enum: ["real", "fake", "uncertain"] },
            confidence: { type: "number", description: "0-100 confidence in the verdict" },
            summary: { type: "string", description: "1-2 sentence plain-English summary" },
            misleading_phrases: {
              type: "array",
              items: { type: "string" },
              description: "Quoted snippets from the input considered misleading or unverifiable",
            },
            red_flags: { type: "array", items: { type: "string" } },
            supporting_signals: { type: "array", items: { type: "string" } },
          },
          required: ["verdict", "confidence", "summary", "misleading_phrases", "red_flags", "supporting_signals"],
          additionalProperties: false,
        },
      },
    };
  }
  if (type === "emotion") {
    return {
      type: "function",
      function: {
        name: "report_emotion",
        description: "Report the dominant facial emotion and per-class scores.",
        parameters: {
          type: "object",
          properties: {
            dominant: { type: "string", enum: ["happy", "sad", "angry", "neutral", "surprised", "fearful", "disgusted", "no_face"] },
            confidence: { type: "number" },
            scores: {
              type: "object",
              properties: {
                happy: { type: "number" },
                sad: { type: "number" },
                angry: { type: "number" },
                neutral: { type: "number" },
                surprised: { type: "number" },
                fearful: { type: "number" },
                disgusted: { type: "number" },
              },
              required: ["happy", "sad", "angry", "neutral", "surprised", "fearful", "disgusted"],
              additionalProperties: false,
            },
            notes: { type: "string" },
          },
          required: ["dominant", "confidence", "scores", "notes"],
          additionalProperties: false,
        },
      },
    };
  }
  if (type === "video") {
    return {
      type: "function",
      function: {
        name: "report_video_deepfake",
        description: "Aggregate verdict over sampled video frames for deepfake detection.",
        parameters: {
          type: "object",
          properties: {
            verdict: { type: "string", enum: ["real", "fake", "uncertain"] },
            confidence: { type: "number" },
            summary: { type: "string" },
            frame_results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  verdict: { type: "string", enum: ["real", "fake", "uncertain"] },
                  confidence: { type: "number" },
                  reason: { type: "string" },
                },
                required: ["index", "verdict", "confidence", "reason"],
                additionalProperties: false,
              },
            },
            artifacts: { type: "array", items: { type: "string" }, description: "Visual artifacts indicating manipulation" },
          },
          required: ["verdict", "confidence", "summary", "frame_results", "artifacts"],
          additionalProperties: false,
        },
      },
    };
  }
  // image / webcam
  return {
    type: "function",
    function: {
      name: "report_image_deepfake",
      description: "Report deepfake detection result for a single image / webcam frame.",
      parameters: {
        type: "object",
        properties: {
          verdict: { type: "string", enum: ["real", "fake", "uncertain"] },
          confidence: { type: "number", description: "0-100" },
          summary: { type: "string" },
          artifacts: {
            type: "array",
            items: { type: "string" },
            description: "Specific manipulation artifacts (e.g. inconsistent lighting on cheek, warped earlobe, GAN texture on iris)",
          },
          regions: {
            type: "array",
            description: "Bounding boxes (normalized 0..1) of suspicious regions for heatmap overlay",
            items: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                w: { type: "number" },
                h: { type: "number" },
                label: { type: "string" },
                severity: { type: "number", description: "0..1" },
              },
              required: ["x", "y", "w", "h", "label", "severity"],
              additionalProperties: false,
            },
          },
          face_present: { type: "boolean" },
          ai_generated_likelihood: { type: "number", description: "0..100, GAN/diffusion-style synthesis likelihood" },
        },
        required: ["verdict", "confidence", "summary", "artifacts", "regions", "face_present", "ai_generated_likelihood"],
        additionalProperties: false,
      },
    },
  };
}

function buildMessages(payload: AnalyzePayload) {
  const { type, imageUrl, frames, text, sourceUrl } = payload;

  if (type === "fakenews") {
    const system = `You are a careful media-forensics analyst. Classify the given news content as real, fake, or uncertain. Use signals like emotional language, unverifiable claims, lack of sources, internal inconsistencies, sensationalism, and known propaganda patterns. Be calibrated — only return "fake" when signals are strong; otherwise "uncertain". Return via the function tool ONLY.`;
    const user = `Source URL: ${sourceUrl ?? "(none)"}\n\nContent:\n${text ?? ""}`.slice(0, 12000);
    return [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
  }

  if (type === "emotion") {
    return [
      {
        role: "system",
        content:
          "You are an expert facial expression analyst. Inspect the face in the image and return per-emotion scores (0..100, summing roughly to 100) and the dominant label. If no human face is present, return dominant='no_face'. Return via the function tool ONLY.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze the dominant facial emotion in this image." },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ];
  }

  if (type === "video") {
    const frameContent: any[] = [
      {
        type: "text",
        text: `You are given ${frames?.length ?? 0} frames sampled uniformly from a short video. For each frame index (starting at 0), evaluate likelihood of deepfake manipulation. Then aggregate to a single verdict for the video. Be concise. Return via the function tool ONLY.`,
      },
    ];
    (frames ?? []).forEach((f) => frameContent.push({ type: "image_url", image_url: { url: f } }));
    return [
      {
        role: "system",
        content:
          "You are a deepfake forensics expert. Look for temporal inconsistencies, blending seams around the face, unnatural blinking, mismatched lighting, GAN artifacts, and identity drift across frames.",
      },
      { role: "user", content: frameContent },
    ];
  }

  // image / webcam
  return [
    {
      role: "system",
      content:
        "You are a deepfake / synthetic-media forensics expert. Inspect the image for manipulation: face-swap seams, GAN/diffusion texture artifacts, inconsistent lighting/shadows, distorted ears/teeth/iris, frequency-domain anomalies. Identify suspicious regions as normalized bounding boxes (x,y,w,h in 0..1 with origin top-left) for an explainability heatmap. Return via the function tool ONLY.",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            type === "webcam"
              ? "This is a single webcam frame. Determine if it shows a real human or an AI-generated/manipulated face. Be fast and decisive."
              : "Analyze this image for deepfake / AI-generated manipulation. Provide explainable regions.",
        },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const payload = (await req.json()) as AnalyzePayload;
    if (!payload?.type) {
      return new Response(JSON.stringify({ error: "Missing 'type'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- EfficientNetB3 external model for image / webcam ----
    const DEEPFAKE_API_URL = Deno.env.get("DEEPFAKE_API_URL");
    if (DEEPFAKE_API_URL && (payload.type === "image" || payload.type === "webcam") && payload.imageUrl) {
      try {
        const DEEPFAKE_API_KEY = Deno.env.get("DEEPFAKE_API_KEY");
        const mlResp = await fetch(DEEPFAKE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(DEEPFAKE_API_KEY ? { Authorization: `Bearer ${DEEPFAKE_API_KEY}` } : {}),
          },
          body: JSON.stringify({ image_url: payload.imageUrl }),
        });
        if (mlResp.ok) {
          const ml = await mlResp.json();
          const verdict = ml.verdict ?? (ml.label === "AI Generated" ? "fake" : "real");
          const confidence = typeof ml.confidence === "number" ? ml.confidence : 0;
          const aiLikelihood =
            typeof ml.ai_generated_likelihood === "number" ? ml.ai_generated_likelihood : confidence;
          const result = {
            verdict,
            confidence,
            summary:
              ml.label === "AI Generated"
                ? `EfficientNetB3 classified this image as AI-generated (${aiLikelihood.toFixed(1)}% likelihood).`
                : `EfficientNetB3 classified this image as a real photograph (${confidence.toFixed(1)}% confidence).`,
            artifacts: ml.artifacts ?? [],
            regions: ml.regions ?? [],
            face_present: ml.face_present ?? null,
            ai_generated_likelihood: aiLikelihood,
            model: ml.model ?? "EfficientNetB3",
          };
          return new Response(JSON.stringify({ type: payload.type, result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("DEEPFAKE_API_URL responded non-OK, falling back to Gemini", mlResp.status);
      } catch (e) {
        console.error("DEEPFAKE_API_URL call failed, falling back to Gemini", e);
      }
    }

    const tool = buildSchemaTool(payload.type);
    const messages = buildMessages(payload);

    const body = {
      model: payload.type === "webcam" ? "google/gemini-2.5-flash-lite" : "google/gemini-2.5-flash",
      messages,
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
    };

    const aiResp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error", detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Model did not return a structured result" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: any = {};
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("parse error", e, toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "Failed to parse model output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ type: payload.type, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});