export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://mass-efa.github.io";
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
    }

    const title = String(payload.title || "").trim();
    const body = String(payload.body || "").trim();

    if (!title || !body || !body.includes("home-evaluation-request")) {
      return new Response(JSON.stringify({ error: "Missing required request fields" }), { status: 400, headers: corsHeaders });
    }

    const owner = env.GITHUB_OWNER || "mass-efa";
    const repo = env.GITHUB_REPO || "home-search";
    const token = env.GITHUB_TOKEN;

    if (!token) {
      return new Response(JSON.stringify({ error: "Server is not configured" }), { status: 500, headers: corsHeaders });
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "home-search-site"
      },
      body: JSON.stringify({
        title,
        body,
        labels: ["home-evaluation"]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "GitHub issue creation failed", details: data }), {
        status: response.status,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({
      issueNumber: data.number,
      issueUrl: data.html_url
    }), {
      status: 201,
      headers: corsHeaders
    });
  }
};
