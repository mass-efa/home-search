(function () {
  var STORAGE_KEY = "homeFindingBuddyMvp.v1";

  var defaultState = {
    workspace: {
      householdName: "",
      searchArea: "",
      budgetRange: "",
      timeline: "",
      agentStatus: ""
    },
    conversationNotes: "",
    brief: null,
    listings: [],
    suggestions: [],
    updatedAt: null
  };

  var state = loadState();
  var remote = {
    configured: false,
    client: null,
    user: null,
    workspaceId: null,
    status: "Local only",
    loading: false
  };
  var syncTimer = null;
  var recognition = null;
  var activeVoiceTarget = null;

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return saved ? Object.assign({}, defaultState, saved) : structuredClone(defaultState);
    } catch (error) {
      return structuredClone(defaultState);
    }
  }

  function saveState(options) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
    if (!options || options.sync !== false) scheduleRemoteSync();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function text(value) {
    return String(value || "").trim();
  }

  function sentence(value) {
    var trimmed = text(value);
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  function includesAny(haystack, needles) {
    var lower = String(haystack || "").toLowerCase();
    return needles.some(function (needle) {
      return lower.indexOf(needle) !== -1;
    });
  }

  function addUnique(items, value) {
    if (value && items.indexOf(value) === -1) items.push(value);
  }

  function hasWorkspaceFrame() {
    return Object.keys(state.workspace || {}).some(function (key) {
      return text(state.workspace[key]);
    });
  }

  function getDebriefCount() {
    return state.listings.reduce(function (sum, item) {
      return sum + item.debriefs.length;
    }, 0);
  }

  function getOpenSuggestionCount() {
    return state.suggestions.filter(function (item) {
      return item.status === "suggested";
    }).length;
  }

  function getSupabaseConfig() {
    return {
      url: text(window.HOME_SEARCH_SUPABASE_URL),
      anonKey: text(window.HOME_SEARCH_SUPABASE_ANON_KEY),
      redirectUrl: text(window.HOME_SEARCH_AUTH_REDIRECT_URL) || window.location.href
    };
  }

  function getAiConfig() {
    return {
      endpoint: text(window.HOME_SEARCH_AI_EVALUATION_ENDPOINT)
    };
  }

  function isRemoteReady() {
    return remote.configured && remote.client && remote.user;
  }

  function isAiReady() {
    return Boolean(getAiConfig().endpoint && isRemoteReady());
  }

  function setRemoteStatus(message) {
    remote.status = message;
    renderAuth();
  }

  function hasMeaningfulState(value) {
    if (!value) return false;
    return Boolean(
      text(value.conversationNotes) ||
      value.brief ||
      (value.listings && value.listings.length) ||
      (value.suggestions && value.suggestions.length) ||
      Object.keys(value.workspace || {}).some(function (key) {
        return text(value.workspace[key]);
      })
    );
  }

  async function setupSupabase() {
    var config = getSupabaseConfig();
    if (!config.url || !config.anonKey) {
      setRemoteStatus("Local only");
      return;
    }

    if (!window.supabase || !window.supabase.createClient) {
      setRemoteStatus("Supabase library unavailable");
      return;
    }

    remote.configured = true;
    remote.client = window.supabase.createClient(config.url, config.anonKey);
    setRemoteStatus("Checking session");

    remote.client.auth.onAuthStateChange(async function (_event, session) {
      remote.user = session && session.user ? session.user : null;
      if (remote.user) {
        await loadRemoteWorkspace();
      } else {
        var justSignedOut = remote.status === "Signing out" || remote.status === "Signed out";
        remote.workspaceId = null;
        setRemoteStatus(justSignedOut ? "Signed out" : "Not signed in");
        render();
      }
    });

    var result = await remote.client.auth.getSession();
    remote.user = result.data && result.data.session ? result.data.session.user : null;
    if (remote.user) {
      await loadRemoteWorkspace();
    } else {
      setRemoteStatus("Not signed in");
      render();
    }
  }

  async function sendMagicLink(email) {
    var config = getSupabaseConfig();
    if (!remote.configured || !remote.client) {
      setRemoteStatus("Add Supabase config first");
      return;
    }
    if (!email) {
      setRemoteStatus("Enter an email");
      return;
    }
    setRemoteStatus("Sending magic link");
    var result = await remote.client.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: config.redirectUrl
      }
    });
    if (result.error) {
      setRemoteStatus("Magic link failed: " + result.error.message);
      return;
    }
    setRemoteStatus("Magic link sent");
  }

  async function signOut() {
    if (!remote.client) return;
    setRemoteStatus("Signing out");
    clearTimeout(syncTimer);
    var result = await remote.client.auth.signOut();
    if (result.error) {
      setRemoteStatus("Sign out failed: " + result.error.message);
      return;
    }
    remote.user = null;
    remote.workspaceId = null;
    setRemoteStatus("Signed out");
    render();
  }

  function scheduleRemoteSync() {
    if (!isRemoteReady() || remote.loading) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      persistRemoteWorkspace();
    }, 800);
  }

  async function loadRemoteWorkspace() {
    if (!isRemoteReady()) return;
    remote.loading = true;
    setRemoteStatus("Loading cloud workspace");

    var response = await remote.client
      .from("home_buddy_workspaces")
      .select("id,title,app_state,updated_at")
      .eq("owner_id", remote.user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (response.error) {
      remote.loading = false;
      setRemoteStatus("Cloud load failed: " + response.error.message);
      return;
    }

    var remoteState = response.data && response.data.app_state ? response.data.app_state : null;
    var localHasData = hasMeaningfulState(state);
    var remoteHasData = hasMeaningfulState(remoteState);

    if (response.data) remote.workspaceId = response.data.id;

    if (remoteHasData && shouldPreferRemote(remoteState, response.data.updated_at)) {
      state = Object.assign({}, structuredClone(defaultState), remoteState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      remote.loading = false;
      setRemoteStatus("Synced from cloud");
      render();
      return;
    }

    remote.loading = false;
    if (localHasData || !response.data) {
      await persistRemoteWorkspace();
    } else {
      setRemoteStatus("Cloud sync ready");
      render();
    }
  }

  function shouldPreferRemote(remoteState, remoteUpdatedAt) {
    if (!hasMeaningfulState(remoteState)) return false;
    if (!hasMeaningfulState(state)) return true;
    if (!state.updatedAt) return true;
    if (!remoteUpdatedAt) return false;
    return new Date(remoteUpdatedAt).getTime() >= new Date(state.updatedAt).getTime();
  }

  async function persistRemoteWorkspace() {
    if (!isRemoteReady()) {
      renderAuth();
      return;
    }

    clearTimeout(syncTimer);
    var title = state.workspace.householdName || "Home Search";
    setRemoteStatus("Syncing");

    var payload = {
      owner_id: remote.user.id,
      title: title,
      app_state: state
    };

    var response;
    if (remote.workspaceId) {
      response = await remote.client
        .from("home_buddy_workspaces")
        .update({
          title: payload.title,
          app_state: payload.app_state
        })
        .eq("id", remote.workspaceId)
        .select("id")
        .single();
    } else {
      response = await remote.client
        .from("home_buddy_workspaces")
        .insert(payload)
        .select("id")
        .single();
    }

    if (response.error) {
      setRemoteStatus("Sync failed: " + response.error.message);
      return;
    }

    remote.workspaceId = response.data.id;
    setRemoteStatus("Synced");
    render();
  }

  async function requestAiEvaluation(listingId) {
    var listing = state.listings.find(function (item) { return item.id === listingId; });
    if (!listing) return;

    var config = getAiConfig();
    if (!config.endpoint) {
      listing.aiStatus = "Configure the AI backend endpoint first.";
      saveState();
      return;
    }
    if (!remote.client || !remote.user) {
      listing.aiStatus = "Sign in before running server AI.";
      saveState();
      return;
    }

    listing.aiStatus = "Running server AI evaluation";
    saveState();

    try {
      var sessionResult = await remote.client.auth.getSession();
      var token = sessionResult.data && sessionResult.data.session
        ? sessionResult.data.session.access_token
        : "";
      if (!token) throw new Error("No active Supabase session");

      var response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspaceId: remote.workspaceId,
          listing: listing,
          brief: state.brief,
          workspace: state.workspace,
          conversationNotes: state.conversationNotes,
          focusQuestions: listing.questions ? [listing.questions] : [],
          decisionStage: listing.decisionStage || "considering-tour",
          analysisDepth: listing.analysisDepth || "decision-brief",
          rubricVersion: "home-evaluation:v1"
        })
      });
      var data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "AI evaluation failed");
      }
      listing.aiCandidate = data.evaluation || null;
      listing.aiEvaluationId = data.evaluationId || null;
      listing.aiModel = data.model || "";
      listing.approvalDecision = data.approvalDecision || null;
      if (listing.approvalDecision && listing.approvalDecision.outcome === "auto_approved") {
        listing.aiEvaluation = data.evaluation;
        listing.aiStatus = "Evidence-checked Decision Brief approved";
      } else {
        listing.aiEvaluation = null;
        listing.aiStatus = approvalStatusCopy(listing.approvalDecision);
      }
      saveState();
    } catch (error) {
      listing.aiStatus = "AI failed: " + (error && error.message ? error.message : "Unknown error");
      saveState();
    }
  }

  function approvalStatusCopy(decision) {
    if (!decision) return "The server did not return an approval decision. Nothing was released.";
    if (decision.outcome === "insufficient_evidence") {
      return "Needs more evidence before a Decision Brief can be released.";
    }
    if (decision.outcome === "needs_review") {
      return "Quality exception: the evidence or analysis needs correction and another validation run.";
    }
    if (decision.outcome === "failed") {
      return "Validation could not complete. No Decision Brief was released.";
    }
    if (decision.outcome === "auto_approved") {
      return "Every critical automated gate passed.";
    }
    return "Decision Brief is not available.";
  }

  function splitSignals(notes) {
    var signals = [];
    var lower = String(notes || "").toLowerCase();

    if (includesAny(lower, ["quiet", "noise", "private", "privacy", "busy road", "street"])) {
      addUnique(signals, "Quiet, privacy, and street feel are major fit signals.");
    }
    if (includesAny(lower, ["walk", "village", "shops", "coffee", "restaurant", "transit"])) {
      addUnique(signals, "Walkability matters, but it should be tested against privacy and daily routine.");
    }
    if (includesAny(lower, ["host", "hosting", "kitchen", "gather", "dinner", "family room"])) {
      addUnique(signals, "Main-level gathering space and kitchen flow deserve special attention.");
    }
    if (includesAny(lower, ["school", "kid", "children", "child"])) {
      addUnique(signals, "School assignment and day-to-day family logistics should be verified directly.");
    }
    if (includesAny(lower, ["office", "work from home", "wfh", "remote"])) {
      addUnique(signals, "Dedicated work-from-home space is part of real fit, not a bonus.");
    }
    if (includesAny(lower, ["turnkey", "move-in", "maintenance", "renovation", "remodel", "surprise cost"])) {
      addUnique(signals, "Low renovation tolerance means older systems and unclear remodel quality are bigger risks.");
    }
    if (includesAny(lower, ["slope", "drainage", "sewer", "roof", "foundation", "basement", "stucco"])) {
      addUnique(signals, "Drainage, sewer, roof, foundation, and exterior envelope diligence should be elevated.");
    }
    if (includesAny(lower, ["view", "light", "sun", "bright"])) {
      addUnique(signals, "Light, views, and emotional lift may justify tradeoffs if the practical risks are controlled.");
    }

    return signals.length ? signals : [
      "The search is still forming; use listing reviews and debriefs to expose real tradeoffs.",
      "Pay attention to emotional reaction, daily routine, hidden maintenance risk, and whether the home earns a tour."
    ];
  }

  function generateBrief() {
    var notes = text(document.querySelector("[data-conversation-notes]").value);
    state.conversationNotes = notes;
    var workspace = state.workspace;
    var signals = splitSignals(notes);
    var area = workspace.searchArea || "the target search area";
    var budget = workspace.budgetRange ? " around " + workspace.budgetRange : "";
    var thesis = "Find a home in " + area + budget + " that matches real daily life, not just saved-search filters.";

    if (signals.some(function (item) { return item.indexOf("Quiet") !== -1; })) {
      thesis = "Prioritize homes that balance privacy, quiet, and daily convenience in " + area + budget + ".";
    } else if (signals.some(function (item) { return item.indexOf("gathering") !== -1; })) {
      thesis = "Prioritize homes with strong everyday flow, hosting space, and manageable diligence risk in " + area + budget + ".";
    }

    state.brief = {
      generatedAt: new Date().toISOString(),
      thesis: thesis,
      mustHaves: buildMustHaves(notes),
      preferences: buildPreferences(notes),
      dealbreakers: buildDealbreakers(notes),
      hiddenRisks: buildHiddenRisks(notes),
      diligenceChecklist: buildDiligenceChecklist(notes),
      attentionRules: signals,
      learningLog: []
    };
    saveState();
    document.querySelector("#brief").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildMustHaves(notes) {
    var items = [];
    if (includesAny(notes, ["quiet", "noise", "private", "privacy"])) addUnique(items, "A street and outdoor setting that feel calm enough to live with every day.");
    if (includesAny(notes, ["host", "hosting", "kitchen", "family room"])) addUnique(items, "A layout that supports gathering without forcing awkward room tradeoffs.");
    if (includesAny(notes, ["office", "work from home", "wfh", "remote"])) addUnique(items, "Reliable work-from-home space with separation from daily household noise.");
    if (includesAny(notes, ["school", "kid", "children"])) addUnique(items, "School and commute logistics that survive direct verification.");
    if (!items.length) addUnique(items, "A home that fits daily routines, budget comfort, and the buyer's actual emotional reaction.");
    return items;
  }

  function buildPreferences(notes) {
    var items = [];
    if (includesAny(notes, ["walk", "shops", "coffee", "village"])) addUnique(items, "Useful walkability near daily errands, coffee, parks, or neighborhood life.");
    if (includesAny(notes, ["view", "light", "bright", "sun"])) addUnique(items, "Good light, outlook, or a view that creates emotional pull.");
    if (includesAny(notes, ["yard", "garden", "outdoor", "deck"])) addUnique(items, "Outdoor space that is actually usable, private, and easy to maintain.");
    if (includesAny(notes, ["guest", "family", "parents"])) addUnique(items, "Guest or multigenerational flexibility without hurting everyday flow.");
    if (!items.length) addUnique(items, "Comfort, livability, and clear tradeoffs over superficial listing polish.");
    return items;
  }

  function buildDealbreakers(notes) {
    var items = [];
    if (includesAny(notes, ["busy road", "too noisy", "noise", "arterial"])) addUnique(items, "Street feel or noise that will be hard to ignore after move-in.");
    if (includesAny(notes, ["renovation", "maintenance", "surprise cost", "turnkey"])) addUnique(items, "Unclear maintenance exposure that exceeds renovation appetite.");
    if (includesAny(notes, ["stairs", "layout", "cramped", "dark"])) addUnique(items, "Layout friction that makes the home feel smaller or harder to use than the photos suggest.");
    if (!items.length) addUnique(items, "Any hidden compromise that turns a good listing into a stressful daily home.");
    return items;
  }

  function buildHiddenRisks(notes) {
    var items = ["Price, comps, and offer timing should be checked before getting attached."];
    if (includesAny(notes, ["old", "1940", "1950", "basement", "sewer", "drainage", "foundation"])) {
      addUnique(items, "Older-home system risk: sewer, drainage, foundation, roof, electrical, plumbing, and basement moisture.");
    }
    if (includesAny(notes, ["remodel", "permit", "adu", "basement", "second kitchen"])) {
      addUnique(items, "Permit, appraisal, and resale complexity from remodels, ADUs, second kitchens, or finished lower levels.");
    }
    if (includesAny(notes, ["school", "boundary"])) {
      addUnique(items, "School assignment ambiguity; verify with the district rather than relying on listing portals.");
    }
    return items;
  }

  function buildDiligenceChecklist(notes) {
    var items = [
      "Ask why the seller is selling and whether there is an offer review date.",
      "Ask for disclosures, title, permit history, and any inspection packet.",
      "Compare listing square footage against county/public records.",
      "Check noise, light, parking, and commute at realistic times."
    ];
    if (includesAny(notes, ["sewer", "drainage", "slope", "basement"])) addUnique(items, "Prioritize sewer scope, drainage, slope, and basement moisture review.");
    if (includesAny(notes, ["renovation", "remodel", "permit"])) addUnique(items, "Verify remodel permits and whether improvements are cosmetic or structural.");
    if (includesAny(notes, ["cooling", "heat", "summer"])) addUnique(items, "Confirm cooling, heat risk, retrofit cost, and comfort during summer.");
    return items;
  }

  function reviewListing(form) {
    var formData = new FormData(form);
    var listing = {
      id: "listing-" + Date.now(),
      url: text(formData.get("listingUrl")),
      address: text(formData.get("listingAddress")),
      price: text(formData.get("listingPrice")),
      notes: text(formData.get("listingNotes")),
      questions: text(formData.get("listingQuestions")),
      decisionStage: text(formData.get("decisionStage")),
      analysisDepth: text(formData.get("analysisDepth")),
      createdAt: new Date().toISOString(),
      debriefs: []
    };
    listing.review = buildListingReview(listing);
    state.listings.unshift(listing);
    saveState();
    form.reset();
    document.querySelector("#listings").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildListingReview(listing) {
    var brief = state.brief || {};
    var combined = [listing.url, listing.address, listing.price, listing.notes].join(" ").toLowerCase();
    var score = 68;
    var matches = [];
    var concerns = [];
    var diligence = [];

    if (includesAny(combined, ["quiet", "private", "cul-de-sac", "dead end", "park"])) {
      score += 8;
      matches.push("The listing suggests quiet/private upside, which appears important to this search.");
    }
    if (includesAny(combined, ["busy", "arterial", "highway", "traffic", "road noise"])) {
      score -= 14;
      concerns.push("Street feel or road noise may be a serious mismatch.");
      diligence.push("Visit at commute time and sit outside for 10 minutes before deciding.");
    }
    if (includesAny(combined, ["updated", "remodeled", "turnkey", "new roof", "new hvac"])) {
      score += 7;
      matches.push("Recent updates may reduce immediate maintenance stress if permits and quality check out.");
    }
    if (includesAny(combined, ["1940", "1950", "basement", "stucco", "slope", "sewer", "foundation", "drainage"])) {
      score -= 8;
      concerns.push("Older-home or site-risk signals deserve real diligence before emotional commitment.");
      diligence.push("Ask for sewer scope, drainage history, roof age, permit history, and inspection reports.");
    }
    if (includesAny(combined, ["walk", "village", "shops", "restaurant", "coffee"])) {
      score += 5;
      matches.push("Walkability or neighborhood convenience may support lifestyle fit.");
    }
    if (includesAny(combined, ["view", "light", "sunny", "bright"])) {
      score += 5;
      matches.push("Light/view upside may create emotional pull and should be tested in person.");
    }
    if (includesAny(combined, ["tiny kitchen", "cramped", "dark", "awkward", "stairs"])) {
      score -= 10;
      concerns.push("Layout friction may matter more than the listing photos reveal.");
    }

    (brief.attentionRules || []).forEach(function (rule) {
      if (rule.indexOf("Drainage") !== -1) addUnique(diligence, "Check drainage, sewer, basement moisture, and exterior envelope carefully.");
      if (rule.indexOf("gathering") !== -1) addUnique(diligence, "Spend extra time in kitchen, dining, and main gathering spaces.");
      if (rule.indexOf("Quiet") !== -1) addUnique(diligence, "Test windows open/closed, outdoor noise, and bedroom quiet.");
    });

    if (!matches.length) matches.push("Potential fit depends on in-person feel and whether the listing details support the search brief.");
    if (!concerns.length) concerns.push("No obvious mismatch from the notes provided, but hidden condition/title risks still need checking.");
    if (!diligence.length) diligence.push("Ask the agent for disclosures, offer timeline, showing activity, title, and permit history.");

    score = Math.max(20, Math.min(96, score));

    var review = {
      score: score,
      recommendation: score >= 80 ? "Tour" : score >= 65 ? "Investigate" : score >= 50 ? "Watch" : "Skip",
      matches: matches,
      concerns: concerns,
      diligence: diligence,
      summary: buildReviewSummary(score, listing)
    };
    review.skillEvaluation = buildSkillEvaluation(listing, review);
    return review;
  }

  function buildReviewSummary(score, listing) {
    var address = listing.address || "This listing";
    if (score >= 80) return address + " looks worth touring if the diligence questions check out.";
    if (score >= 65) return address + " may be worth attention, but it needs targeted investigation before a tour or offer.";
    if (score >= 50) return address + " is a watch item unless new information improves fit or reduces risk.";
    return address + " looks like a likely skip based on current fit/risk signals.";
  }

  function buildSkillEvaluation(listing, review) {
    var combined = [listing.url, listing.address, listing.price, listing.notes].join(" ").toLowerCase();
    var decisionRead = review.score >= 80 ? "Promising" :
      review.score >= 65 ? "Needs diligence" :
      review.score >= 50 ? "Concerning" : "Pass for now";
    var mainReasons = review.matches.slice(0, 3);
    var mainRisks = review.concerns.slice(0, 3);
    var nextAction = buildSkillNextAction(review);

    if (!mainReasons.length) mainReasons.push("The home needs more facts before there is a clear reason to like it.");
    if (!mainRisks.length) mainRisks.push("The largest current risk is missing source data, not a known defect.");

    return {
      skillName: "Home Evaluation Skill",
      skillVersion: "home-evaluation:v1",
      decisionRead: decisionRead,
      negotiationPosture: buildNegotiationPosture(combined, review),
      nextAction: nextAction,
      mainReasons: mainReasons,
      mainRisks: mainRisks,
      evidenceLimits: "This is a screening read from the pasted listing notes and buyer brief. Verify live facts with source documents and qualified professionals.",
      sections: [
        buildPropertySnapshotSection(listing, combined),
        buildSchoolsSection(combined),
        buildSafetySection(combined),
        buildAreaValueSection(combined),
        buildPropertyValueSection(listing, combined),
        buildNegotiationSection(combined),
        buildConditionSection(combined, review),
        buildTitleSection(combined),
        buildFinancialSection(listing, combined),
        buildLifestyleSection(review),
        buildClimateSiteSection(combined),
        buildOpenQuestionsSection(listing, combined, review)
      ]
    };
  }

  function buildSkillSection(title, items, missing) {
    var cleanItems = items.filter(Boolean);
    var cleanMissing = missing.filter(Boolean);
    return {
      title: title,
      status: cleanMissing.length ? (cleanItems.length ? "Partial" : "Needs facts") : "Covered",
      items: cleanItems.length ? cleanItems : ["No reliable signal yet from the pasted listing notes."],
      missing: cleanMissing
    };
  }

  function buildPropertySnapshotSection(listing, combined) {
    var items = [];
    var missing = [];
    if (listing.address) items.push("Address captured: " + listing.address + ".");
    if (listing.price) items.push("Price/status captured: " + listing.price + ".");
    if (listing.url) items.push("Listing URL captured for source follow-up.");
    if (includesAny(combined, ["bed", "bd", "bath", "ba", "sq ft", "sqft", "square feet", "lot", "acre", "year built", "built"])) {
      items.push("Some core property facts appear in the notes; verify against MLS and county records.");
    }
    if (!includesAny(combined, ["bed", "bd", "bath", "ba"])) missing.push("Beds and baths.");
    if (!includesAny(combined, ["sq ft", "sqft", "square feet"])) missing.push("Interior square footage.");
    if (!includesAny(combined, ["lot", "acre"])) missing.push("Lot size.");
    if (!includesAny(combined, ["year built", "built", "remodeled", "renovated"])) missing.push("Year built and remodel history.");
    return buildSkillSection("Property Snapshot", items, missing);
  }

  function buildSchoolsSection(combined) {
    var items = [];
    var missing = ["Assigned elementary, middle, and high schools from the official district boundary source."];
    if (includesAny(combined, ["school", "district", "boundary", "elementary", "middle", "high school"])) {
      items.push("School fit is mentioned; verify the exact assigned schools with the district rather than portal labels.");
      missing = ["Future reassignment risk and program-specific notes."];
    }
    return buildSkillSection("Schools", items, missing);
  }

  function buildSafetySection(combined) {
    var items = [];
    var missing = ["Official local crime or police dashboard read for violent crime and property crime separately."];
    if (includesAny(combined, ["busy", "arterial", "traffic", "road noise", "transit", "commercial"])) {
      items.push("Practical safety/comfort issue to test: street activity, traffic, and noise at realistic times.");
    }
    if (includesAny(combined, ["crime", "burglary", "prowler", "package theft", "safety"])) {
      items.push("Safety is explicitly raised; separate property-crime nuisance from personal safety risk.");
      missing = ["Current official incident data for the immediate area."];
    }
    return buildSkillSection("Safety", items, missing);
  }

  function buildAreaValueSection(combined) {
    var items = [];
    var missing = ["Neighborhood and ZIP trend from a current reliable source, labeled by data type and date."];
    if (includesAny(combined, ["appreciation", "value trend", "median", "inventory", "market", "cooling"])) {
      items.push("Market trend is mentioned; treat small-area medians as noisy unless backed by enough nearby sales.");
    }
    return buildSkillSection("Area Value And Appreciation", items, missing);
  }

  function buildPropertyValueSection(listing, combined) {
    var items = [];
    var missing = ["Nearby comparable sales with similar size, condition, age, lot, and school assignment."];
    if (listing.price) items.push("List price is captured; compare it to recent nearby sales before getting attached.");
    if (includesAny(combined, ["comp", "price per square foot", "ppsf", "$/sf", "sale-to-list", "sold"])) {
      items.push("Comparable-sale signal appears in the notes; check whether the comps are truly similar.");
      missing = ["Adjusted price-per-square-foot comparison against the best comps."];
    }
    return buildSkillSection("Property Value And Comps", items, missing);
  }

  function buildNegotiationSection(combined) {
    var items = [];
    var missing = ["Days on market, offer deadline, buyer activity, relist history, and seller motivation."];
    if (includesAny(combined, ["days on market", "dom", "price cut", "reduced", "vacant", "failed pending", "back on market"])) {
      items.push("Possible leverage signal: stale listing, price movement, vacancy, or failed pending status.");
      missing = ["Agent read on current activity and seller motivation."];
    }
    if (includesAny(combined, ["offer review", "deadline", "multiple offers", "pre-inspected"])) {
      items.push("Competitive-process signal: confirm offer timing, pre-inspection expectations, and escalation norms.");
      missing = ["Number of disclosures pulled and level of current buyer interest."];
    }
    return buildSkillSection("Negotiation Leverage", items, missing);
  }

  function buildConditionSection(combined, review) {
    var items = review.diligence.slice(0, 4);
    var missing = ["Seller disclosure, inspection report, permit history, and age of roof/HVAC/water heater."];
    if (includesAny(combined, ["sewer", "drainage", "foundation", "slope", "basement", "roof", "hvac", "water heater", "electrical", "plumbing"])) {
      addUnique(items, "Condition risk is material enough to request specialist diligence before offer confidence.");
      missing = ["Specialist scope for any flagged system: sewer, drainage, roof, structural, HVAC, electrical, or pest."];
    }
    return buildSkillSection("Condition And Inspection Risk", items, missing);
  }

  function buildTitleSection(combined) {
    var items = [];
    var missing = ["Preliminary title, Schedule B exceptions, easements, CCRs, HOA documents, permits, and open code issues."];
    if (includesAny(combined, ["hoa", "condo", "townhome", "ccr", "easement", "shared driveway", "adu", "permit", "unpermitted", "encroachment"])) {
      items.push("Legal/title complexity may affect use, resale, financing, insurance, or remodel flexibility.");
      missing = ["Title officer or real estate attorney review for unclear exceptions or unpermitted work."];
    }
    return buildSkillSection("Title, HOA, Permits, And Legal", items, missing);
  }

  function buildFinancialSection(listing, combined) {
    var items = [];
    var missing = ["Taxes, insurance, HOA, utilities, maintenance reserve, and near-term capital expense estimate."];
    if (listing.price) items.push("Price is known; translate it into monthly cost and liquidity risk before offer mode.");
    if (includesAny(combined, ["tax", "hoa", "insurance", "assessment", "utility", "maintenance", "reserve"])) {
      items.push("Monthly or capital cost driver appears in the notes; include it in the financial fit check.");
      missing = ["Full monthly cost stack and likely first-24-month repair budget."];
    }
    return buildSkillSection("Financial Fit", items, missing);
  }

  function buildLifestyleSection(review) {
    var items = review.matches.concat(review.concerns).slice(0, 5);
    var missing = ["Commute, noise, parking, privacy, yard usability, walkability, storage, and work-from-home fit from an in-person tour."];
    if (items.length) missing = ["In-person confirmation that the listing-photo fit survives real daily-life use."];
    return buildSkillSection("Lifestyle Fit", items, missing);
  }

  function buildClimateSiteSection(combined) {
    var items = [];
    var missing = ["Flood, landslide/slope, wildfire/smoke, drainage, tree, heat/cooling, and insurance availability checks where relevant."];
    if (includesAny(combined, ["flood", "wildfire", "smoke", "landslide", "slope", "drainage", "tree", "hot", "cooling", "heat pump"])) {
      items.push("Physical-site or climate signal is present; verify with official maps and inspection scope.");
      missing = ["Official map/source confirmation for the flagged physical-site risk."];
    }
    return buildSkillSection("Climate And Physical Site Risks", items, missing);
  }

  function buildOpenQuestionsSection(listing, combined, review) {
    var items = [
      "What facts would change the decision read from " + review.recommendation + "?",
      "What documents should be requested before a tour or offer?"
    ];
    if (!listing.url) items.push("Add the listing URL so source facts can be revisited.");
    if (!listing.notes) items.push("Paste listing copy, disclosure notes, or agent comments to improve the read.");
    if (includesAny(combined, ["sewer", "drainage", "foundation", "slope", "basement"])) {
      items.push("Do inspection reports reduce or confirm the site/system risk?");
    }
    return buildSkillSection("Open Questions And Next Actions", items, [buildSkillNextAction(review)]);
  }

  function buildSkillNextAction(review) {
    if (review.score >= 80) return "Tour, then request disclosures and verify the highest-risk diligence items before offer prep.";
    if (review.score >= 65) return "Investigate first: request disclosures, inspection packet, offer timeline, and the best comparable sales.";
    if (review.score >= 50) return "Watch unless new facts improve fit or reduce the top risk.";
    return "Skip for now unless price, facts, or buyer priorities materially change.";
  }

  function buildNegotiationPosture(combined, review) {
    if (review.score < 50) return "Do not chase; only revisit with a major fact or price change.";
    if (includesAny(combined, ["offer review", "deadline", "multiple offers"])) return "Competitive posture only if diligence is clean and the home is a strong fit.";
    if (includesAny(combined, ["price cut", "reduced", "days on market", "dom", "vacant", "failed pending", "back on market"])) {
      return "Potential leverage: ask about seller motivation, stale-listing history, and concession room.";
    }
    if (review.score >= 80) return "Prepare to move quickly, but keep inspection and comp discipline.";
    return "Neutral posture: gather facts before deciding whether to tour, wait, or negotiate.";
  }

  function saveDebrief(form) {
    var formData = new FormData(form);
    var listingId = text(formData.get("listingId"));
    var notes = text(formData.get("debriefNotes"));
    if (!listingId || !notes) return;

    var listing = state.listings.find(function (item) { return item.id === listingId; });
    if (!listing) return;

    var debrief = analyzeDebrief(notes);
    listing.debriefs.unshift({
      id: "debrief-" + Date.now(),
      notes: notes,
      createdAt: new Date().toISOString(),
      summary: debrief.summary,
      liked: debrief.liked,
      concerns: debrief.concerns,
      nextStep: debrief.nextStep
    });

    debrief.suggestions.forEach(function (suggestion) {
      state.suggestions.unshift({
        id: "suggestion-" + Date.now() + "-" + Math.random().toString(16).slice(2),
        text: suggestion,
        sourceListingId: listing.id,
        status: "suggested"
      });
    });

    form.reset();
    saveState();
    document.querySelector("#brief").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function analyzeDebrief(notes) {
    var liked = [];
    var concerns = [];
    var suggestions = [];
    var lower = notes.toLowerCase();

    if (includesAny(lower, ["loved", "liked", "great", "beautiful", "bright", "view", "light"])) {
      liked.push("There was clear positive emotional signal in the tour reaction.");
    }
    if (includesAny(lower, ["quiet", "private", "calm"])) {
      liked.push("Quiet/privacy felt valuable in person.");
      suggestions.push("Increase priority of quiet/private setting if this reaction repeats.");
    }
    if (includesAny(lower, ["kitchen", "hosting", "gather", "living room", "family room"])) {
      liked.push("Gathering space showed up in the reaction.");
      suggestions.push("Track main-level gathering flow as a high-priority fit factor.");
    }
    if (includesAny(lower, ["noisy", "busy", "traffic", "road", "loud"])) {
      concerns.push("Street feel or noise created hesitation.");
      suggestions.push("Treat busy-road feel as a stronger negative signal in future reviews.");
    }
    if (includesAny(lower, ["dark", "cramped", "small", "awkward", "stairs"])) {
      concerns.push("Layout or room feel created friction.");
      suggestions.push("Add layout feel to the tour checklist before getting attached to photos.");
    }
    if (includesAny(lower, ["old", "maintenance", "repair", "drainage", "sewer", "roof", "basement"])) {
      concerns.push("Condition or hidden maintenance risk came up in the debrief.");
      suggestions.push("Increase diligence weight for system age, drainage, sewer, and remodel quality.");
    }
    if (includesAny(lower, ["disagree", "different", "trusha", "partner", "argument"])) {
      concerns.push("Partner alignment needs explicit follow-up before this home advances.");
      suggestions.push("Add partner disagreement notes to the Buyer Search Brief.");
    }

    if (!liked.length) liked.push("No strong positive signal was detected; clarify what, if anything, pulled you in.");
    if (!concerns.length) concerns.push("No strong concern was detected; verify whether that means true confidence or incomplete debrief.");

    var nextStep = includesAny(lower, ["offer", "love", "excited", "go back"]) ? "Consider revisit or offer-prep questions." :
      includesAny(lower, ["skip", "no", "hate", "dealbreaker"]) ? "Likely skip unless new information changes the read." :
      "Keep as watch/investigate until the open questions are resolved.";

    return {
      summary: sentence(notes.slice(0, 220)) + (notes.length > 220 ? "..." : ""),
      liked: liked,
      concerns: concerns,
      suggestions: suggestions,
      nextStep: nextStep
    };
  }

  function acceptSuggestion(id) {
    var suggestion = state.suggestions.find(function (item) { return item.id === id; });
    if (!suggestion) return;
    suggestion.status = "accepted";
    if (state.brief) {
      state.brief.learningLog = state.brief.learningLog || [];
      addUnique(state.brief.learningLog, suggestion.text);
    }
    saveState();
  }

  function rejectSuggestion(id) {
    var suggestion = state.suggestions.find(function (item) { return item.id === id; });
    if (!suggestion) return;
    suggestion.status = "rejected";
    saveState();
  }

  function setupVoice() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("Voice capture is not supported in this browser. Use dictation or type notes.");
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = function (event) {
      var finalText = "";
      for (var i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      if (finalText && activeVoiceTarget) {
        var target = document.getElementById(activeVoiceTarget);
        target.value = (target.value ? target.value + " " : "") + finalText.trim();
      }
    };

    recognition.onstart = function () {
      setVoiceStatus("Voice capture is recording.");
    };

    recognition.onend = function () {
      setVoiceStatus("Voice capture is idle.");
      activeVoiceTarget = null;
    };

    recognition.onerror = function (event) {
      setVoiceStatus("Voice capture stopped: " + event.error + ".");
      activeVoiceTarget = null;
    };
  }

  function startVoice(targetId) {
    if (!recognition) {
      setVoiceStatus("Voice capture is not supported in this browser.");
      return;
    }
    activeVoiceTarget = targetId;
    recognition.start();
  }

  function stopVoice() {
    if (recognition) recognition.stop();
  }

  function setVoiceStatus(message) {
    document.querySelectorAll("[data-voice-status]").forEach(function (node) {
      node.textContent = message;
    });
  }

  function render() {
    renderAuth();
    renderAiBackendState();
    renderWorkspaceForm();
    renderConversation();
    renderSummary();
    renderFlowState();
    renderBrief();
    renderSuggestions();
    renderListings();
    renderDebriefOptions();
  }

  function renderAuth() {
    var accountState = document.querySelector("[data-account-state]");
    var syncStatus = document.querySelector("[data-sync-status]");
    var authEmail = document.querySelector("[data-auth-email]");
    var authDetail = document.querySelector("[data-auth-detail]");
    var authForm = document.querySelector("[data-auth-form]");
    var authActions = document.querySelector("[data-auth-actions]");
    var syncButton = document.querySelector("[data-sync-now]");
    var signOutButton = document.querySelector("[data-sign-out]");

    if (!accountState || !syncStatus || !authEmail || !authDetail) return;

    accountState.textContent = remote.user ? "Signed in" : (remote.configured ? "Not signed in" : "Local only");
    accountState.dataset.state = remote.user ? "signed-in" : (remote.configured ? "signed-out" : "local");
    syncStatus.textContent = remote.status;
    syncStatus.dataset.state = remote.user ? "signed-in" : (remote.configured ? "signed-out" : "local");
    authEmail.textContent = remote.user && remote.user.email ? remote.user.email : "Not signed in";
    authDetail.textContent = remote.configured
      ? (remote.user
        ? "Workspace is stored in browser storage and Supabase."
        : (remote.status === "Signed out" ? "Signed out. This browser still keeps the local workspace." : "Sign in to sync this workspace across devices."))
      : "Configure Supabase URL and anon key in assets/config.js to enable cloud sync.";

    if (authForm) authForm.hidden = Boolean(remote.user);
    if (authActions) authActions.hidden = !remote.user;
    if (syncButton) syncButton.disabled = !remote.user;
    if (signOutButton) signOutButton.disabled = !remote.user;
  }

  function renderAiBackendState() {
    var target = document.querySelector("[data-ai-backend-state]");
    if (!target) return;
    if (!getAiConfig().endpoint) {
      target.textContent = "Server AI is not configured yet.";
    } else if (!remote.user) {
      target.textContent = "Sign in to run server AI evaluations.";
    } else {
      target.textContent = "Server AI is ready for signed-in evaluations.";
    }
  }

  function renderWorkspaceForm() {
    var form = document.querySelector("[data-workspace-form]");
    if (!form) return;
    Object.keys(state.workspace).forEach(function (key) {
      var field = form.elements[key];
      if (field && document.activeElement !== field) field.value = state.workspace[key] || "";
    });
  }

  function renderConversation() {
    var field = document.querySelector("[data-conversation-notes]");
    if (field && document.activeElement !== field) field.value = state.conversationNotes || "";
  }

  function renderSummary() {
    document.querySelector("[data-brief-state]").textContent = state.brief ? "Active" : "Not started";
    document.querySelector("[data-listing-count]").textContent = String(state.listings.length);
    var debriefCount = getDebriefCount();
    document.querySelector("[data-debrief-count]").textContent = String(debriefCount);
    document.querySelector("[data-current-thesis]").textContent = state.brief ? state.brief.thesis : "No search thesis yet.";
    document.querySelector("[data-next-action]").textContent = getNextAction().label;
    var latest = state.listings[0];
    document.querySelector("[data-latest-review]").textContent = latest ? latest.review.recommendation + ": " + (latest.address || latest.url || "Latest listing") : "No listing reviewed yet.";
  }

  function getNextAction() {
    if (!hasWorkspaceFrame()) {
      return {
        label: "Set the search frame.",
        title: "Set the search frame",
        detail: "Save the basic search context, then capture what you want in plain language.",
        href: "#workspace",
        cta: "Set search frame"
      };
    }
    if (!state.brief) {
      return {
        label: "Build the search brief.",
        title: "Build the search brief",
        detail: "Use the conversation area to turn reactions and tradeoffs into a working standard.",
        href: "#conversation",
        cta: "Build search brief"
      };
    }
    if (!state.listings.length) {
      return {
        label: "Review the first listing.",
        title: "Review a listing",
        detail: "Paste a home and screen it against the current brief before spending tour time.",
        href: "#listings",
        cta: "Review listing"
      };
    }
    if (!getDebriefCount()) {
      return {
        label: "Debrief the latest tour.",
        title: "Debrief a tour",
        detail: "Capture the reaction while it is fresh so future reviews get sharper.",
        href: "#debrief",
        cta: "Debrief tour"
      };
    }
    if (getOpenSuggestionCount()) {
      return {
        label: "Review suggested profile updates.",
        title: "Apply new learnings",
        detail: "Accept the debrief learnings that should change future listing reviews.",
        href: "#brief",
        cta: "Review learnings"
      };
    }
    return {
      label: "Review another listing or debrief the next tour.",
      title: "Keep the loop moving",
      detail: "Use each new listing and tour reaction to tighten the search.",
      href: "#listings",
      cta: "Review another listing"
    };
  }

  function renderFlowState() {
    var nextAction = getNextAction();
    var completed = [
      hasWorkspaceFrame(),
      Boolean(state.brief),
      Boolean(state.listings.length),
      Boolean(getDebriefCount())
    ].filter(Boolean).length;
    var progressNode = document.querySelector("[data-flow-progress]");
    var stageTitle = document.querySelector("[data-flow-stage-title]");
    var stageDetail = document.querySelector("[data-flow-stage-detail]");
    var primaryAction = document.querySelector("[data-primary-action]");

    if (progressNode) progressNode.style.width = String(Math.max(8, completed * 25)) + "%";
    if (stageTitle) stageTitle.textContent = nextAction.title;
    if (stageDetail) stageDetail.textContent = nextAction.detail;
    if (primaryAction) {
      primaryAction.textContent = nextAction.cta;
      primaryAction.setAttribute("href", nextAction.href);
    }

    setTaskStatus("workspace", hasWorkspaceFrame() ? "Saved" : "Start here");
    setTaskStatus("brief", state.brief ? "Active" : (hasWorkspaceFrame() ? "Ready" : "Needs frame"));
    setTaskStatus("listing", state.listings.length ? String(state.listings.length) + " reviewed" : (state.brief ? "Ready" : "Brief helps"));
    setTaskStatus("debrief", getDebriefCount() ? String(getDebriefCount()) + " saved" : (state.listings.length ? "Ready" : "Needs listing"));

    setFlowStep("workspace", hasWorkspaceFrame());
    setFlowStep("brief", Boolean(state.brief));
    setFlowStep("listing", Boolean(state.listings.length));
    setFlowStep("debrief", Boolean(getDebriefCount()));
  }

  function setTaskStatus(name, label) {
    var task = document.querySelector('[data-task-card="' + name + '"]');
    var status = document.querySelector('[data-task-status="' + name + '"]');
    if (task) task.dataset.state = label === "Ready" || label === "Start here" ? "ready" : "active";
    if (status) status.textContent = label;
  }

  function setFlowStep(name, done) {
    var step = document.querySelector('[data-flow-step="' + name + '"]');
    var status = document.querySelector('[data-flow-step-status="' + name + '"]');
    if (step) step.dataset.state = done ? "done" : "open";
    if (status) status.textContent = done ? "Done" : "Open";
  }

  function renderBrief() {
    var target = document.querySelector("[data-brief-output]");
    if (!state.brief) {
      target.innerHTML = '<p class="empty-state">Generate a search brief from the buyer conversation.</p>';
      return;
    }

    target.innerHTML = [
      briefBlock("Search thesis", [state.brief.thesis]),
      briefBlock("Must-haves", state.brief.mustHaves),
      briefBlock("Strong preferences", state.brief.preferences),
      briefBlock("Dealbreakers", state.brief.dealbreakers),
      briefBlock("Hidden risk sensitivity", state.brief.hiddenRisks),
      briefBlock("Diligence checklist", state.brief.diligenceChecklist),
      briefBlock("What the product should watch", state.brief.attentionRules),
      briefBlock("What we are learning", state.brief.learningLog || [])
    ].join("");
  }

  function briefBlock(title, items) {
    var list = (items && items.length ? items : ["No entries yet."]).map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");
    return '<article class="brief-block"><h3>' + escapeHtml(title) + "</h3><ul>" + list + "</ul></article>";
  }

  function renderSuggestions() {
    var target = document.querySelector("[data-suggestion-list]");
    var suggestions = state.suggestions.filter(function (item) { return item.status === "suggested"; });
    if (!suggestions.length) {
      target.innerHTML = "";
      return;
    }
    target.innerHTML = [
      "<h3>Suggested profile updates</h3>",
      suggestions.map(function (suggestion) {
        return [
          '<article class="suggestion-card">',
          "<p>" + escapeHtml(suggestion.text) + "</p>",
          '<div class="hero-actions compact-actions">',
          '<button class="button" type="button" data-accept-suggestion="' + escapeHtml(suggestion.id) + '">Accept</button>',
          '<button class="button secondary" type="button" data-reject-suggestion="' + escapeHtml(suggestion.id) + '">Reject</button>',
          "</div>",
          "</article>"
        ].join("");
      }).join("")
    ].join("");
  }

  function renderListings() {
    var target = document.querySelector("[data-listing-stack]");
    if (!state.listings.length) {
      target.innerHTML = [
        '<div class="empty-state action-empty">',
        "<strong>No listings reviewed yet.</strong>",
        "<p>Paste the next promising home above and the review will appear here.</p>",
        "</div>"
      ].join("");
      return;
    }
    target.innerHTML = state.listings.map(function (listing) {
      var review = listing.review || buildListingReview(listing);
      if (!review.skillEvaluation) review.skillEvaluation = buildSkillEvaluation(listing, review);
      var skillEvaluation = review.skillEvaluation;
      return [
        '<article class="listing-card">',
        '<div class="listing-card-head">',
        "<div>",
        "<h3>" + escapeHtml(listing.address || listing.url || "Untitled listing") + "</h3>",
        '<p class="muted-line">' + escapeHtml([listing.price, dateLabel(listing.createdAt)].filter(Boolean).join(" · ")) + "</p>",
        "</div>",
        '<span class="score-pill">' + escapeHtml(review.recommendation) + " · " + escapeHtml(review.score) + "</span>",
        "</div>",
        "<p>" + escapeHtml(review.summary) + "</p>",
        renderAiEvaluationAction(listing),
        renderApprovalDecision(listing),
        listing.aiEvaluation ? renderApprovedEvaluation(listing.aiEvaluation) : "",
        renderSkillEvaluation(skillEvaluation),
        reviewList("Fit signals", review.matches),
        reviewList("Immediate concerns", review.concerns),
        reviewList("First diligence moves", review.diligence),
        listing.debriefs.length ? reviewList("Latest debrief", [listing.debriefs[0].summary, listing.debriefs[0].nextStep]) : "",
        "</article>"
      ].join("");
    }).join("");
  }

  function reviewList(title, items) {
    return '<div class="review-list"><strong>' + escapeHtml(title) + "</strong><ul>" + items.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("") + "</ul></div>";
  }

  function renderAiEvaluationAction(listing) {
    var endpoint = getAiConfig().endpoint;
    var ready = isAiReady();
    var hasAi = Boolean(listing.approvalDecision);
    var disabled = ready ? "" : " disabled";
    var buttonLabel = hasAi ? "Refresh evidence-checked brief" : "Build evidence-checked brief";
    var hint = !endpoint
      ? "Set HOME_SEARCH_AI_EVALUATION_ENDPOINT after deploying the Supabase Edge Function."
      : (!remote.user ? "Sign in to run a private evidence-checked analysis." : "The result is released only when every critical automated gate passes.");
    if (listing.aiStatus) hint = listing.aiStatus;
    return [
      '<div class="ai-action">',
      '<button class="button secondary" type="button" data-run-ai-evaluation="' + escapeHtml(listing.id) + '"' + disabled + ">" + escapeHtml(buttonLabel) + "</button>",
      "<span>" + escapeHtml(hint) + "</span>",
      "</div>"
    ].join("");
  }

  function renderApprovalDecision(listing) {
    var decision = listing.approvalDecision;
    if (!decision) return "";
    var labels = {
      auto_approved: "Automatically approved",
      needs_review: "Quality exception",
      insufficient_evidence: "Needs more evidence",
      failed: "Validation failed"
    };
    var reasons = Array.isArray(decision.reasonCodes) ? decision.reasonCodes : [];
    return [
      '<section class="approval-panel" data-outcome="' + escapeHtml(decision.outcome) + '">',
      '<div><span>Evidence-checked Decision Brief</span><strong>' + escapeHtml(labels[decision.outcome] || "Not released") + "</strong></div>",
      "<p>" + escapeHtml(approvalStatusCopy(decision)) + "</p>",
      reasons.length ? '<p class="approval-reasons">Recorded checks: ' + escapeHtml(reasons.join(", ")) + "</p>" : "",
      decision.decidedAt ? "<small>Validated " + escapeHtml(dateLabel(decision.decidedAt)) + "</small>" : "",
      "</section>"
    ].join("");
  }

  function renderApprovedEvaluation(evaluation) {
    return [
      '<div class="approved-divider"><span>Released Decision Brief</span></div>',
      renderSkillEvaluation(evaluation)
    ].join("");
  }

  function renderSkillEvaluation(evaluation) {
    if (!evaluation) return "";
    return [
      '<section class="skill-evaluation" aria-label="Home Evaluation Skill read">',
      '<div class="skill-header">',
      '<span>' + escapeHtml(evaluation.skillName) + "</span>",
      '<strong>' + escapeHtml(evaluation.decisionRead) + "</strong>",
      "</div>",
      '<div class="skill-decision-grid">',
      skillDecisionBlock("Negotiation posture", evaluation.negotiationPosture),
      skillDecisionBlock("Next action", evaluation.nextAction),
      skillDecisionBlock("Evidence limit", evaluation.evidenceLimits),
      "</div>",
      reviewList("Main reasons to like it", evaluation.mainReasons),
      reviewList("Main risks or unknowns", evaluation.mainRisks),
      '<div class="skill-section-grid">',
      evaluation.sections.map(renderSkillSection).join(""),
      "</div>",
      "</section>"
    ].join("");
  }

  function skillDecisionBlock(label, value) {
    return [
      "<article>",
      "<span>" + escapeHtml(label) + "</span>",
      "<strong>" + escapeHtml(value) + "</strong>",
      "</article>"
    ].join("");
  }

  function renderSkillSection(section) {
    return [
      '<details class="skill-section">',
      "<summary>",
      "<span>" + escapeHtml(section.title) + "</span>",
      "<em>" + escapeHtml(section.status) + "</em>",
      "</summary>",
      "<ul>",
      section.items.map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      }).join(""),
      "</ul>",
      section.missing.length ? '<p class="missing-label">Missing / verify next</p><ul>' + section.missing.map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      }).join("") + "</ul>" : "",
      "</details>"
    ].join("");
  }

  function renderDebriefOptions() {
    var select = document.querySelector("[data-debrief-listing]");
    if (!select) return;
    if (!state.listings.length) {
      select.innerHTML = '<option value="">Review a listing first</option>';
      return;
    }
    select.innerHTML = state.listings.map(function (listing) {
      return '<option value="' + escapeHtml(listing.id) + '">' + escapeHtml(listing.address || listing.url || "Untitled listing") + "</option>";
    }).join("");

    var output = document.querySelector("[data-debrief-output]");
    var latestListing = state.listings.find(function (listing) { return listing.debriefs.length; });
    if (!latestListing) {
      output.innerHTML = '<p class="empty-state">No tour debrief saved yet.</p>';
      return;
    }
    var latest = latestListing.debriefs[0];
    output.innerHTML = [
      '<article class="debrief-card">',
      "<h3>" + escapeHtml(latestListing.address || latestListing.url || "Latest debrief") + "</h3>",
      "<p>" + escapeHtml(latest.summary) + "</p>",
      reviewList("Liked", latest.liked),
      reviewList("Concerns", latest.concerns),
      reviewList("Next step", [latest.nextStep]),
      "</article>"
    ].join("");
  }

  function dateLabel(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function copyBrief() {
    if (!state.brief) return;
    var lines = [
      "Buyer Search Brief",
      "",
      "Search thesis",
      state.brief.thesis,
      "",
      "Must-haves",
      state.brief.mustHaves.map(function (item) { return "- " + item; }).join("\n"),
      "",
      "Strong preferences",
      state.brief.preferences.map(function (item) { return "- " + item; }).join("\n"),
      "",
      "Dealbreakers",
      state.brief.dealbreakers.map(function (item) { return "- " + item; }).join("\n"),
      "",
      "Hidden risks",
      state.brief.hiddenRisks.map(function (item) { return "- " + item; }).join("\n")
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(function () {
      setVoiceStatus("Buyer Search Brief copied.");
    });
  }

  function bindEvents() {
    document.querySelector("[data-auth-form]").addEventListener("submit", function (event) {
      event.preventDefault();
      sendMagicLink(text(new FormData(event.currentTarget).get("email")));
    });

    document.querySelector("[data-sync-now]").addEventListener("click", function () {
      persistRemoteWorkspace();
    });

    document.querySelector("[data-sign-out]").addEventListener("click", function () {
      signOut();
    });

    document.querySelector("[data-workspace-form]").addEventListener("submit", function (event) {
      event.preventDefault();
      var hadWorkspaceFrame = hasWorkspaceFrame();
      var formData = new FormData(event.currentTarget);
      Object.keys(state.workspace).forEach(function (key) {
        state.workspace[key] = text(formData.get(key));
      });
      saveState();
      if (!hadWorkspaceFrame && hasWorkspaceFrame()) {
        document.querySelector("#conversation").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    document.querySelector("[data-save-conversation]").addEventListener("click", function () {
      state.conversationNotes = text(document.querySelector("[data-conversation-notes]").value);
      saveState();
    });

    document.querySelector("[data-generate-brief]").addEventListener("click", generateBrief);

    document.querySelector("[data-listing-form]").addEventListener("submit", function (event) {
      event.preventDefault();
      reviewListing(event.currentTarget);
    });

    document.querySelector("[data-debrief-form]").addEventListener("submit", function (event) {
      event.preventDefault();
      saveDebrief(event.currentTarget);
    });

    document.querySelector("[data-copy-brief]").addEventListener("click", copyBrief);

    document.querySelector("[data-reset-demo]").addEventListener("click", function () {
      if (!confirm("Reset this local workspace?")) return;
      state = structuredClone(defaultState);
      saveState();
    });

    document.querySelectorAll("[data-prompt]").forEach(function (button) {
      button.addEventListener("click", function () {
        var field = document.querySelector("[data-conversation-notes]");
        field.value = (field.value ? field.value + "\n\n" : "") + button.getAttribute("data-prompt");
        field.focus();
      });
    });

    document.querySelectorAll("[data-voice-start]").forEach(function (button) {
      button.addEventListener("click", function () {
        startVoice(button.getAttribute("data-voice-start"));
      });
    });

    document.querySelectorAll("[data-voice-stop]").forEach(function (button) {
      button.addEventListener("click", stopVoice);
    });

    document.addEventListener("click", function (event) {
      var accept = event.target.closest("[data-accept-suggestion]");
      var reject = event.target.closest("[data-reject-suggestion]");
      var aiButton = event.target.closest("[data-run-ai-evaluation]");
      if (accept) acceptSuggestion(accept.getAttribute("data-accept-suggestion"));
      if (reject) rejectSuggestion(reject.getAttribute("data-reject-suggestion"));
      if (aiButton) requestAiEvaluation(aiButton.getAttribute("data-run-ai-evaluation"));
    });
  }

  if (typeof structuredClone !== "function") {
    window.structuredClone = function (value) {
      return JSON.parse(JSON.stringify(value));
    };
  }

  setupVoice();
  bindEvents();
  render();
  setupSupabase().catch(function (error) {
    setRemoteStatus("Supabase setup failed: " + error.message);
  });
}());
