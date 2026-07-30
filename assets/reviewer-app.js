(function () {
  var client = null;
  var user = null;
  var requests = [];
  var activeFilter = "in_review";

  function text(value) {
    return String(value || "").trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function dateLabel(value) {
    if (!value) return "";
    return new Date(value).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    });
  }

  function setAuthStatus(message) {
    var node = document.querySelector("[data-reviewer-auth-status]");
    if (node) node.textContent = message;
  }

  function authErrorMessage(error) {
    var message = text(error && error.message).toLowerCase();
    var status = Number(error && error.status);
    if (status === 429 || message.includes("rate limit")) {
      return "Too many sign-in attempts. Wait a minute, then try again.";
    }
    if (message.includes("redirect") || message.includes("url")) {
      return "This preview is not yet approved as a sign-in destination.";
    }
    if (message.includes("email") || message.includes("smtp")) {
      return "The sign-in email could not be delivered. Check the project email setup.";
    }
    return "We couldn’t send the sign-in link. Error: " + text(error && (error.code || error.status || error.name || "unknown"));
  }

  function setReviewerReady(ready, message) {
    var notice = document.querySelector("[data-reviewer-prereq]");
    var button = document.querySelector("[data-reviewer-auth-submit]");
    if (notice) notice.hidden = ready;
    if (button) button.disabled = !ready;
    if (message) setAuthStatus(message);
  }

  async function setup() {
    if (window.location.protocol === "file:") {
      setReviewerReady(false, "Open the deployed reviewer workspace—or run the project through its local web preview—to sign in.");
      return;
    }
    var url = text(window.HOME_SEARCH_SUPABASE_URL);
    var key = text(window.HOME_SEARCH_SUPABASE_ANON_KEY);
    if (!url || !key || !window.supabase) {
      setReviewerReady(false, "Reviewer access is not configured in this environment.");
      return;
    }
    setReviewerReady(true);
    client = window.supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    var session = await client.auth.getSession();
    user = session.data && session.data.session ? session.data.session.user : null;
    await renderAuth();
    client.auth.onAuthStateChange(async function (_event, nextSession) {
      user = nextSession && nextSession.user ? nextSession.user : null;
      await renderAuth();
    });
  }

  async function renderAuth() {
    var auth = document.querySelector("[data-reviewer-auth]");
    var workspace = document.querySelector("[data-reviewer-workspace]");
    var signOut = document.querySelector("[data-reviewer-sign-out]");
    if (!user) {
      auth.hidden = false;
      workspace.hidden = true;
      signOut.hidden = true;
      return;
    }
    var role = await client
      .from("home_buddy_staff_roles")
      .select("role,active")
      .eq("user_id", user.id)
      .maybeSingle();
    if (role.error || !role.data || !role.data.active) {
      auth.hidden = false;
      workspace.hidden = true;
      signOut.hidden = false;
      setAuthStatus("This account has not been provisioned as a reviewer.");
      return;
    }
    auth.hidden = true;
    workspace.hidden = false;
    signOut.hidden = false;
    await loadQueue();
  }

  async function loadQueue() {
    var target = document.querySelector("[data-review-queue]");
    target.innerHTML = "<p>Loading the review queue…</p>";
    var response = await client
      .from("home_buddy_evaluation_requests")
      .select("id,listing_label,decision_stage,analysis_depth,status,safe_status_message,latest_evaluation_id,submitted_at,updated_at,released_at")
      .order("submitted_at", { ascending: true });
    if (response.error) {
      target.innerHTML = '<div class="review-empty"><h2>We couldn’t load the review queue.</h2><button class="button secondary" type="button" data-refresh-review-queue>Try again</button></div>';
      return;
    }
    requests = response.data || [];
    renderCounts();
    renderQueue();
  }

  function renderCounts() {
    ["in_review", "needs_buyer_input", "ready", "failed"].forEach(function (status) {
      var node = document.querySelector('[data-review-count="' + status + '"]');
      if (node) node.textContent = String(requests.filter(function (item) { return item.status === status; }).length);
    });
  }

  function renderQueue() {
    var target = document.querySelector("[data-review-queue]");
    var filtered = requests.filter(function (item) { return item.status === activeFilter; });
    if (!filtered.length) {
      target.innerHTML = '<div class="review-empty"><h2>Nothing is waiting here.</h2><p>New reports will appear as their status changes.</p></div>';
      return;
    }
    target.innerHTML = filtered.map(function (item) {
      return [
        '<button class="review-queue-card" type="button" data-open-review="' + escapeHtml(item.id) + '">',
        '<span class="review-status" data-status="' + escapeHtml(item.status) + '">' + escapeHtml(item.status.replaceAll("_", " ")) + "</span>",
        "<strong>" + escapeHtml(item.listing_label) + "</strong>",
        "<span>" + escapeHtml(item.decision_stage.replaceAll("-", " ")) + " · " + escapeHtml(item.analysis_depth.replaceAll("-", " ")) + "</span>",
        "<small>Submitted " + escapeHtml(dateLabel(item.submitted_at)) + "</small>",
        "</button>"
      ].join("");
    }).join("");
  }

  async function openReview(requestId) {
    var request = requests.find(function (item) { return item.id === requestId; });
    if (!request) return;
    var target = document.querySelector("[data-review-detail]");
    target.innerHTML = "<p>Loading report evidence…</p>";
    var evaluation = await client
      .from("home_buddy_ai_evaluations")
      .select("id,candidate,validator_results,independent_evaluation,approval_decision,created_at")
      .eq("id", request.latest_evaluation_id)
      .maybeSingle();
    if (evaluation.error || !evaluation.data) {
      target.innerHTML = '<div class="review-empty"><h2>Report evidence is unavailable.</h2><p>This request cannot be released.</p></div>';
      return;
    }
    var row = evaluation.data;
    var validators = Array.isArray(row.validator_results) ? row.validator_results : [];
    var failed = validators.filter(function (gate) { return gate.status !== "pass"; });
    var releasable = request.status === "in_review"
      && row.approval_decision
      && row.approval_decision.outcome === "auto_approved"
      && row.independent_evaluation
      && row.independent_evaluation.status === "passed"
      && !failed.length;
    var decision = row.candidate && row.candidate.decisionRead;
    target.innerHTML = [
      '<div class="review-detail-head">',
      '<span class="review-status" data-status="' + escapeHtml(request.status) + '">' + escapeHtml(request.status.replaceAll("_", " ")) + "</span>",
      "<h2>" + escapeHtml(request.listing_label) + "</h2>",
      "<p>" + escapeHtml(request.decision_stage.replaceAll("-", " ")) + " · " + escapeHtml(request.analysis_depth.replaceAll("-", " ")) + "</p>",
      "</div>",
      '<section class="review-proposed"><span>Proposed bottom line</span><strong>' + escapeHtml(decision || "No decision summary available.") + "</strong></section>",
      '<section class="review-release-preview"><h3>Exact buyer artifact</h3>',
      ((row.candidate && row.candidate.sections) || []).map(function (section) {
        return '<article><strong>' + escapeHtml(String(section.id || "").replaceAll("_", " ")) + '</strong><p>' + escapeHtml(section.content) + "</p></article>";
      }).join(""),
      "</section>",
      '<section class="review-gates"><h3>Automated evidence checks</h3>',
      validators.map(function (gate) {
        return '<div><span>' + escapeHtml(gate.id) + '</span><strong data-state="' + escapeHtml(gate.status) + '">' + escapeHtml(gate.status) + "</strong></div>";
      }).join(""),
      "</section>",
      '<form class="release-checklist" data-release-form data-request-id="' + escapeHtml(request.id) + '">',
      "<h3>Release checks</h3>",
      [
        "The bottom line matches the evidence.",
        "Critical claims have direct sources.",
        "Unknowns are clear and prominent.",
        "Buyer-specific fit is separated from facts.",
        "No private context is exposed.",
        "Advice boundaries are appropriate.",
        "Questions and next steps are actionable."
      ].map(function (label, index) {
        return '<label><input type="checkbox" name="check-' + index + '" required><span>' + escapeHtml(label) + "</span></label>";
      }).join(""),
      '<label class="review-note"><span>Release note <small>Internal</small></span><textarea name="note" placeholder="Optional note for the audit record"></textarea></label>',
      releasable
        ? '<button class="button coral" type="submit">Release to buyer</button>'
        : '<button class="button secondary" type="button" disabled>Release requirements not met</button>',
      failed.length ? "<p>" + escapeHtml(failed.length) + " automated check(s) still need resolution.</p>" : "",
      "</form>"
    ].join("");
  }

  async function releaseReport(form) {
    if (!form.reportValidity()) return;
    var requestId = form.getAttribute("data-request-id");
    if (!window.confirm("Release this reviewed report to the buyer?")) return;
    var button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Releasing…";
    var response = await client.rpc("release_home_buddy_result", {
      p_request_id: requestId,
      p_note: text(new FormData(form).get("note"))
    });
    if (response.error) {
      button.disabled = false;
      button.textContent = "Release to buyer";
      window.alert("This report could not be released. Recheck the evidence requirements.");
      return;
    }
    document.querySelector("[data-review-detail]").innerHTML = '<div class="release-success"><span>✓</span><h2>Report released to the buyer.</h2><p>The immutable reviewed version is now available in their workspace.</p></div>';
    await loadQueue();
  }

  document.addEventListener("submit", function (event) {
    if (event.target.matches("[data-reviewer-auth-form]")) {
      event.preventDefault();
      if (!client) {
        setAuthStatus("Reviewer sign-in is unavailable in this preview.");
        return;
      }
      client.auth.signInWithOtp({
        email: text(new FormData(event.target).get("email")),
        options: {
          emailRedirectTo: text(window.HOME_SEARCH_AUTH_REDIRECT_URL)
            || (window.location.origin + window.location.pathname)
        }
      }).then(function (result) {
        setAuthStatus(result.error ? authErrorMessage(result.error) : "Check your email for the secure sign-in link.");
      });
    }
    if (event.target.matches("[data-release-form]")) {
      event.preventDefault();
      releaseReport(event.target);
    }
  });

  document.addEventListener("click", function (event) {
    var filter = event.target.closest("[data-review-filter]");
    var open = event.target.closest("[data-open-review]");
    var refresh = event.target.closest("[data-refresh-review-queue]");
    var signOut = event.target.closest("[data-reviewer-sign-out]");
    if (filter) {
      activeFilter = filter.getAttribute("data-review-filter");
      document.querySelectorAll("[data-review-filter]").forEach(function (button) {
        button.setAttribute("aria-pressed", button === filter ? "true" : "false");
      });
      renderQueue();
    }
    if (open) openReview(open.getAttribute("data-open-review"));
    if (refresh) loadQueue();
    if (signOut && client) client.auth.signOut();
  });

  setup();
}());
