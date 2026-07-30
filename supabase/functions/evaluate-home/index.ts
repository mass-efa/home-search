import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "../../../lib/approval/index.js";
import "../../../lib/approval/validators.js";
import "../../../lib/sources/king-county-property-identity.js";
import "../../../lib/evidence/index.js";

type RequestPayload = {
  workspaceId?: string;
  listing?: Record<string, unknown>;
  brief?: Record<string, unknown> | null;
  workspace?: Record<string, unknown>;
  conversationNotes?: string;
  focusQuestions?: string[];
  decisionStage?: string;
  analysisDepth?: string;
  rubricVersion?: string;
};

const RUBRIC_VERSION = "home-evaluation:v1";
const DEFAULT_MODEL = "gpt-4.1-mini";
const EVALUATOR_VERSION = "decision-pack-independent-evaluator:v1";

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

function getOpenAiApiKey() {
  return Deno.env.get("OPENAI_API_KEY") ||
    Deno.env.get("Home_search_oai_key") || "";
}

async function callOpenAi(input: Record<string, unknown>) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured");
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

async function sha256(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildCandidate(
  evaluation: Record<string, unknown>,
  listing: ReturnType<typeof normalizeListing>,
  payload: RequestPayload,
  checkedAt: string,
  identityResult: Record<string, any>
) {
  const focusQuestions = Array.isArray(payload.focusQuestions)
    ? payload.focusQuestions.map(requireString).filter(Boolean)
    : [];
  const questionText = focusQuestions[0] ||
    "What should the buyer verify before relying on this screening read?";
  const nextAction = requireString(evaluation.nextAction) ||
    "Verify the material facts with source records and qualified professionals.";
  const reasons = Array.isArray(evaluation.mainReasons) ? evaluation.mainReasons : [];
  const risks = Array.isArray(evaluation.mainRisks) ? evaluation.mainRisks : [];
  const evidenceLimits = requireString(evaluation.evidenceLimits);
  const decisionRead = requireString(evaluation.decisionRead);
  const identitySource = identityResult && identityResult.source
    ? {
      id: identityResult.source.id,
      title: identityResult.source.title,
      origin: "official_record",
      retrievedAt: identityResult.source.retrievedAt,
      url: identityResult.source.url,
      adapter: identityResult.source.adapterVersion
    }
    : null;
  const mapper = (globalThis as Record<string, any>).HomeSearchEvidence;
  const mapped = mapper.mapEvidence({
    identity: {
      resolved: identityResult && identityResult.ok === true,
      address: identityResult && identityResult.identity
        ? identityResult.identity.displayAddress
        : "",
      parcelId: identityResult && identityResult.identity
        ? identityResult.identity.parcelId
        : "",
      sourceIds: identitySource ? [identitySource.id] : [],
      checkedAt,
      conflict: identityResult && ["multiple_results", "ambiguous"].includes(identityResult.status)
    },
    sources: identitySource ? [identitySource] : [],
    evaluation: {
      claims: reasons.map((item, index) => ({
        id: `claim-reason-${index + 1}`,
        classification: "inference",
        materiality: "context",
        text: requireString(item),
        sourceIds: [],
        checkedAt
      })).concat(risks.map((item, index) => ({
        id: `claim-risk-${index + 1}`,
        classification: "inference",
        materiality: "material",
        text: requireString(item),
        sourceIds: [],
        checkedAt
      })))
    }
  });
  return {
    schemaVersion: "decision-pack:v1",
    decisionRead,
    disclaimer: "This is a research aid. Verify material facts with qualified professionals before relying on it.",
    sections: [
      { id: "decision_read", content: decisionRead },
      { id: "buyer_fit", content: reasons.map(requireString).filter(Boolean).join(" ") || "No verified fit conclusion yet." },
      { id: "risks_unknowns", content: risks.map(requireString).filter(Boolean).join(" ") || "Material risks remain unverified." },
      { id: "questions_actions", content: nextAction },
      { id: "evidence_limits", content: evidenceLimits || "Only buyer-submitted context was available." }
    ],
    buyerQuestions: [{ id: "buyer-question-1", text: questionText }],
    questionAnswers: [{ questionId: "buyer-question-1", answer: nextAction }],
    claims: mapped.claims,
    sources: mapped.sources,
    calculations: [],
    sharePayload: {
      decisionRead,
      evidenceLimits: evidenceLimits || "Only buyer-submitted context was available."
    }
  };
}

async function callIndependentEvaluator(
  candidate: Record<string, unknown>,
  inputHash: string
) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) throw new Error("OpenAI API key is not configured");
  const model = Deno.env.get("OPENAI_EVALUATOR_MODEL") ||
    Deno.env.get("OPENAI_MODEL") || DEFAULT_MODEL;
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["status", "findingCodes"],
    properties: {
      status: { type: "string", enum: ["passed", "blocking_findings"] },
      findingCodes: {
        type: "array",
        maxItems: 10,
        items: { type: "string" }
      }
    }
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            "Independently evaluate this home Decision Brief candidate.",
            "Return blocking_findings for unsupported factual certainty, contradictions, missed buyer questions, professional-boundary violations, or a recommendation that exceeds its stated evidence.",
            "Do not add facts, edit the candidate, or approve based on confidence alone."
          ].join(" ")
        },
        { role: "user", content: JSON.stringify(candidate) }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "decision_pack_independent_evaluation",
          strict: true,
          schema
        }
      }
    })
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error("Independent evaluator request failed");
  const outputText = extractOutputText(data);
  if (!outputText) throw new Error("Independent evaluator returned no structured output");
  const result = JSON.parse(outputText);
  return {
    evaluatorVersion: EVALUATOR_VERSION,
    inputHash,
    status: result.status,
    findingCodes: result.findingCodes
  };
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
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(request, { error: "Supabase environment is not configured" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse(request, { error: "Invalid Supabase auth token" }, 401);
  }
  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const buyerContext = {
    workspace: payload.workspace || {},
    brief: payload.brief || null,
    conversationNotes: requireString(payload.conversationNotes)
  };

  try {
    const checkedAt = new Date().toISOString();
    const identityApi = (globalThis as Record<string, any>).KingCountyPropertyIdentity;
    const identityResult = await identityApi.resolvePropertyIdentity(listing.address, {
      fetch,
      now: () => checkedAt
    });
    const { evaluation, model } = await callOpenAi({
      rubricVersion: payload.rubricVersion || RUBRIC_VERSION,
      listing,
      buyerContext,
      propertyIdentity: identityResult && identityResult.ok
        ? identityResult.identity
        : { status: identityResult ? identityResult.status : "failed" }
    });
    const candidate = buildCandidate(
      evaluation as Record<string, unknown>,
      listing,
      payload,
      checkedAt,
      identityResult
    );
    const inputHash = await sha256(candidate);
    const validatorApi = (globalThis as Record<string, any>).HomeSearchApprovalValidators;
    const approvalApi = (globalThis as Record<string, any>).HomeSearchApproval;
    const validators = validatorApi.validateDecisionPack(candidate, {
      now: checkedAt,
      maxSourceAgeDays: 30
    });
    validators.push({
      id: "property_identity",
      status: identityResult.ok ? "pass" : "fail",
      failureCode: identityResult.ok
        ? null
        : `identity_${identityResult.status || "failed"}`,
      detail: identityResult.ok
        ? null
        : "The submitted address did not resolve to exactly one authoritative King County parcel."
    });
    const unsupportedCritical = candidate.claims.some((claim: Record<string, unknown>) =>
      claim.materiality === "critical" && claim.evidenceStatus !== "supported"
    );
    validators.push({
      id: "critical_evidence",
      status: unsupportedCritical ? "fail" : "pass",
      failureCode: unsupportedCritical ? "critical_claim_not_supported" : null,
      detail: unsupportedCritical
        ? "At least one critical claim lacks eligible evidence."
        : null
    });
    validators.push({
      id: "coverage_area",
      status: identityResult.ok
        ? "pass"
        : "fail",
      failureCode: identityResult.ok
        ? null
        : "outside_supported_alpha_coverage",
      detail: identityResult.ok
        ? null
        : "Automated approval is currently bounded to declared Seattle/King County coverage."
    });
    let independentEvaluator;
    try {
      independentEvaluator = await callIndependentEvaluator(candidate, inputHash);
    } catch (_error) {
      independentEvaluator = {
        evaluatorVersion: EVALUATOR_VERSION,
        inputHash,
        status: "error",
        findingCodes: ["independent_evaluator_unavailable"]
      };
    }
    if (Deno.env.get("AUTOMATED_APPROVAL_ENABLED") !== "true") {
      independentEvaluator = {
        evaluatorVersion: EVALUATOR_VERSION,
        inputHash,
        status: "blocking_findings",
        findingCodes: ["automatic_approval_disabled"]
      };
    }
    const approvalDecision = approvalApi.decideApproval({
      analysisDraftId: crypto.randomUUID(),
      inputHash,
      validatorSuiteVersion: validatorApi.VALIDATOR_SUITE_VERSION,
      validators,
      independentEvaluator,
      criticalGates: ["property_identity", "critical_evidence", "coverage_area"],
      evidenceGates: ["property_identity", "critical_evidence"],
      decidedAt: checkedAt
    });

    const { data: saved, error: saveError } = await admin
      .from("home_buddy_ai_evaluations")
      .insert({
        owner_id: userData.user.id,
        workspace_id: payload.workspaceId || null,
        listing_id: listing.id,
        rubric_version: RUBRIC_VERSION,
        model,
        status: approvalDecision.outcome,
        listing_snapshot: listing,
        buyer_context: buyerContext,
        evaluation,
        candidate,
        validator_results: validators,
        independent_evaluation: independentEvaluator,
        approval_decision: approvalDecision
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
      evaluation: approvalDecision.outcome === "auto_approved" ? evaluation : null,
      approvalDecision
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI evaluation failed";
    await admin.from("home_buddy_ai_evaluations").insert({
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
