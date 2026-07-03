import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RequestPayload = {
  workspaceId?: string;
  listing?: Record<string, unknown>;
  brief?: Record<string, unknown> | null;
  workspace?: Record<string, unknown>;
  conversationNotes?: string;
  rubricVersion?: string;
};

const RUBRIC_VERSION = "home-evaluation:v1";
const DEFAULT_MODEL = "gpt-4.1-mini";

const evaluationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "skillName",
    "skillVersion",
    "decisionRead",
    "negotiationPosture",
    "nextAction",
    "mainReasons",
    "mainRisks",
    "evidenceLimits",
    "sections"
  ],
  properties: {
    skillName: { type: "string" },
    skillVersion: { type: "string" },
    decisionRead: {
      type: "string",
      enum: ["Promising", "Needs diligence", "Concerning", "Pass for now"]
    },
    negotiationPosture: { type: "string" },
    nextAction: { type: "string" },
    mainReasons: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" }
    },
    mainRisks: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" }
    },
    evidenceLimits: { type: "string" },
    sections: {
      type: "array",
      minItems: 12,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "status", "items", "missing"],
        properties: {
          title: {
            type: "string",
            enum: [
              "Property Snapshot",
              "Schools",
              "Safety",
              "Area Value And Appreciation",
              "Property Value And Comps",
              "Negotiation Leverage",
              "Condition And Inspection Risk",
              "Title, HOA, Permits, And Legal",
              "Financial Fit",
              "Lifestyle Fit",
              "Climate And Physical Site Risks",
              "Open Questions And Next Actions"
            ]
          },
          status: {
            type: "string",
            enum: ["Covered", "Partial", "Needs facts"]
          },
          items: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: { type: "string" }
          },
          missing: {
            type: "array",
            maxItems: 6,
            items: { type: "string" }
          }
        }
      }
    }
  }
};

const systemPrompt = [
  "You are the server-side Home Evaluation Skill for a buyer-facing home search product.",
  "Produce a practical screening evaluation, not a final purchase recommendation.",
  "Separate facts from inferences, explicitly name missing source data, and avoid legal, inspection, financing, school, crime, appraisal, or title certainty.",
  "Use the buyer brief and pasted listing notes as context. If live source data is missing, say what must be verified.",
  "Lead with a decision read, main reasons to like it, main risks, negotiation posture, and next action.",
  "Always include these rubric sections: Property Snapshot, Schools, Safety, Area Value And Appreciation, Property Value And Comps, Negotiation Leverage, Condition And Inspection Risk, Title, HOA, Permits, And Legal, Financial Fit, Lifestyle Fit, Climate And Physical Site Risks, Open Questions And Next Actions."
].join(" ");

function corsHeaders(request: Request) {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "*";
  const origin = request.headers.get("Origin") || allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allowedOrigin === "*" ? origin : allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Content-Type": "application/json"
  };
}

function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request)
  });
}

function requireString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeListing(value: unknown) {
  const listing = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    id: requireString(listing.id),
    url: requireString(listing.url),
    address: requireString(listing.address),
    price: requireString(listing.price),
    notes: requireString(listing.notes),
    createdAt: requireString(listing.createdAt)
  };
}

function extractOutputText(data: Record<string, unknown>) {
  if (typeof data.output_text === "string") return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const record = item as Record<string, unknown>;
    const content = Array.isArray(record.content) ? record.content : [];
    for (const part of content) {
      const contentPart = part as Record<string, unknown>;
      if (typeof contentPart.text === "string") return contentPart.text;
    }
  }
  return "";
}

async function callOpenAi(input: Record<string, unknown>) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = Deno.env.get("OPENAI_MODEL") || DEFAULT_MODEL;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(input) }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "home_evaluation",
          strict: true,
          schema: evaluationSchema
        }
      }
    })
  });

  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.error === "object" && data.error
      ? JSON.stringify(data.error)
      : JSON.stringify(data);
    throw new Error(`OpenAI request failed: ${message}`);
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    throw new Error("OpenAI response did not include structured output text");
  }

  const evaluation = JSON.parse(outputText);
  evaluation.skillName = evaluation.skillName || "AI Home Evaluation Skill";
  evaluation.skillVersion = evaluation.skillVersion || RUBRIC_VERSION;
  return { evaluation, model };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return jsonResponse(request, { error: "Missing Supabase auth token" }, 401);
  }

  let payload: RequestPayload;
  try {
    payload = await request.json() as RequestPayload;
  } catch (_error) {
    return jsonResponse(request, { error: "Invalid JSON" }, 400);
  }

  const listing = normalizeListing(payload.listing);
  if (!listing.id || (!listing.address && !listing.url && !listing.notes)) {
    return jsonResponse(request, { error: "Missing listing details" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(request, { error: "Supabase environment is not configured" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse(request, { error: "Invalid Supabase auth token" }, 401);
  }

  const buyerContext = {
    workspace: payload.workspace || {},
    brief: payload.brief || null,
    conversationNotes: requireString(payload.conversationNotes)
  };

  try {
    const { evaluation, model } = await callOpenAi({
      rubricVersion: payload.rubricVersion || RUBRIC_VERSION,
      listing,
      buyerContext
    });

    const { data: saved, error: saveError } = await supabase
      .from("home_buddy_ai_evaluations")
      .insert({
        owner_id: userData.user.id,
        workspace_id: payload.workspaceId || null,
        listing_id: listing.id,
        rubric_version: RUBRIC_VERSION,
        model,
        status: "complete",
        listing_snapshot: listing,
        buyer_context: buyerContext,
        evaluation
      })
      .select("id,created_at")
      .single();

    if (saveError) {
      return jsonResponse(request, {
        error: "Evaluation completed but could not be saved",
        details: saveError.message,
        evaluation
      }, 500);
    }

    return jsonResponse(request, {
      evaluationId: saved.id,
      createdAt: saved.created_at,
      model,
      evaluation
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI evaluation failed";
    await supabase.from("home_buddy_ai_evaluations").insert({
      owner_id: userData.user.id,
      workspace_id: payload.workspaceId || null,
      listing_id: listing.id,
      rubric_version: RUBRIC_VERSION,
      status: "error",
      listing_snapshot: listing,
      buyer_context: buyerContext,
      evaluation: {},
      error: message
    });
    return jsonResponse(request, { error: message }, 500);
  }
});
