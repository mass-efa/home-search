(function () {
  var STORAGE_KEY = "homeFindingBuddyMvp.v1";
  var UI_STATE_KEY = "homeFindingBuddyMvp.ui.v1";
  var FUNNEL_KEY = "homeFindingBuddyMvp.funnel.v1";
  var PENDING_ANALYSIS_KEY = "homeFindingBuddyMvp.pendingAnalysis.v1";
  var REQUEST_DRAFT_KEY = "homeFindingBuddyMvp.requestDraft.v1";
  var DOCUMENT_STAGE_KEY = "homeFindingBuddyMvp.documentStage.v1";
  var DOCUMENT_DB_NAME = "homeFindingBuddyMvp.privateDocuments.v1";
  var DOCUMENT_STORE_NAME = "stagedDocuments";

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
  var requestStatusTimer = null;
  var recognition = null;
  var activeVoiceTarget = null;
  var uiState = loadUiState();
  var funnelSessionId = createId("session");

  function createId(prefix) {
    return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  }

  function applyProductBrand() {
    var name = text(window.HOME_SEARCH_PRODUCT_NAME) || "Home-Finding Buddy";
    document.querySelectorAll("[data-product-name]").forEach(function (node) {
      node.textContent = name;
    });
    document.title = name;
  }

  function loadUiState() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(UI_STATE_KEY) || "null");
      var ui = Object.assign({
        activeView: "",
        requestStep: 1,
        activeListingId: null,
        editingListingId: null,
        pendingAnalysisListingId: null,
        authRetryAfter: null
      }, saved || {});
      ui.pendingAnalysisListingId = ui.pendingAnalysisListingId || localStorage.getItem(PENDING_ANALYSIS_KEY) || null;
      return ui;
    } catch (error) {
      return {
        activeView: "",
        requestStep: 1,
        activeListingId: null,
        editingListingId: null,
        pendingAnalysisListingId: null,
        authRetryAfter: null
      };
    }
  }

  function saveUiState() {
    try {
      sessionStorage.setItem(UI_STATE_KEY, JSON.stringify(uiState));
      if (uiState.pendingAnalysisListingId) {
        localStorage.setItem(PENDING_ANALYSIS_KEY, uiState.pendingAnalysisListingId);
      } else {
        localStorage.removeItem(PENDING_ANALYSIS_KEY);
      }
    } catch (error) {
      // The product remains usable when private browsing blocks session storage.
    }
  }

  function trackFunnel(name, properties) {
    var event = {
      id: createId("event"),
      name: name,
      at: new Date().toISOString(),
      sessionId: funnelSessionId,
      properties: properties || {},
      synced: false
    };
    try {
      var events = JSON.parse(localStorage.getItem(FUNNEL_KEY) || "[]");
      if (!Array.isArray(events)) events = [];
      events.push(event);
      localStorage.setItem(FUNNEL_KEY, JSON.stringify(events.slice(-100)));
    } catch (error) {
      // Analytics must never block a buyer task.
    }
    window.dispatchEvent(new CustomEvent("home-finding-buddy:funnel", {
      detail: event
    }));
    if (remote.client && remote.user) flushFunnelEvents();
  }

  async function flushFunnelEvents() {
    if (!remote.client || !remote.user) return;
    try {
      var events = JSON.parse(localStorage.getItem(FUNNEL_KEY) || "[]");
      if (!Array.isArray(events)) return;
      var unsynced = events.filter(function (event) { return !event.synced; }).slice(0, 50);
      if (!unsynced.length) return;
      var rows = unsynced.map(function (event) {
        return {
          client_event_id: event.id || createId("legacy-event"),
          owner_id: remote.user.id,
          anonymous_session_id: event.sessionId || "unknown",
          request_id: event.properties && event.properties.requestId ? event.properties.requestId : null,
          event_name: event.name,
          properties: event.properties || {},
          occurred_at: event.at
        };
      });
      var response = await remote.client
        .from("home_buddy_product_events")
        .upsert(rows, { onConflict: "client_event_id", ignoreDuplicates: true });
      if (response.error) return;
      var syncedIds = new Set(unsynced.map(function (event) { return event.id; }));
      events.forEach(function (event) {
        if (syncedIds.has(event.id)) event.synced = true;
      });
      localStorage.setItem(FUNNEL_KEY, JSON.stringify(events.slice(-100)));
    } catch (error) {
      // Central analytics are best-effort and never block the buyer flow.
    }
  }

  function setActiveView(name, options) {
    if (!name) return;
    var views = document.querySelectorAll("[data-view]");
    var hasTargetView = Array.from(views).some(function (view) {
      return view.getAttribute("data-view") === name;
    });
    if (views.length && !hasTargetView) {
      var fallbackTarget = document.getElementById(name);
      if (fallbackTarget) fallbackTarget.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    uiState.activeView = name;
    saveUiState();

    if (views.length) {
      views.forEach(function (view) {
        var active = view.getAttribute("data-view") === name;
        view.hidden = !active;
        view.setAttribute("aria-hidden", active ? "false" : "true");
      });
    }

    document.querySelectorAll("[data-view-target], [data-nav-view]").forEach(function (control) {
      var target = control.getAttribute("data-view-target") || control.getAttribute("data-nav-view");
      var active = target === name;
      control.setAttribute("aria-current", active ? "page" : "false");
      control.dataset.active = active ? "true" : "false";
    });

    if (!options || options.track !== false) trackFunnel("view_opened", { view: name });
    if (name === "results" && getActiveListing()) {
      trackFunnel("report_opened", {
        hasApprovedBrief: Boolean(getActiveListing().aiEvaluation)
      });
    }
    if (options && options.focus) {
      var activeView = document.querySelector('[data-view="' + name + '"]');
      var heading = activeView && activeView.querySelector("h1, h2, [data-view-heading]");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
  }

  function setRequestStep(step, options) {
    var steps = Array.from(document.querySelectorAll("[data-request-step]"));
    var maxStep = steps.reduce(function (maximum, node) {
      return Math.max(maximum, Number(node.getAttribute("data-request-step")) || 1);
    }, 1);
    uiState.requestStep = Math.min(Math.max(Number(step) || 1, 1), maxStep);
    saveUiState();

    steps.forEach(function (node) {
      var active = Number(node.getAttribute("data-request-step")) === uiState.requestStep;
      node.hidden = !active;
      node.setAttribute("aria-hidden", active ? "false" : "true");
    });
    document.querySelectorAll("[data-request-progress]").forEach(function (node) {
      node.textContent = "Step " + uiState.requestStep + " of " + maxStep;
      if (node.parentElement) {
        node.parentElement.style.setProperty("--request-progress", String((uiState.requestStep / maxStep) * 100) + "%");
        node.parentElement.setAttribute("aria-valuenow", String(uiState.requestStep));
      }
    });
    if (!options || options.track !== false) {
      trackFunnel("request_step_viewed", { step: uiState.requestStep, totalSteps: maxStep });
      if (uiState.requestStep === maxStep) {
        trackFunnel("request_reviewed", {
          depthDefault: "decision-brief",
          signedIn: Boolean(remote.user)
        });
      }
    }
  }

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return saved ? sanitizeLoadedState(Object.assign({}, defaultState, saved)) : structuredClone(defaultState);
    } catch (error) {
      return structuredClone(defaultState);
    }
  }

  function sanitizeLoadedState(loadedState) {
    var sanitized = structuredClone(loadedState || defaultState);
    if (!Array.isArray(sanitized.listings)) sanitized.listings = [];
    sanitized.listings.forEach(function (listing) {
      listing.aiEvaluation = null;
      listing.aiCandidate = null;
      listing.approvalDecision = null;
      listing.aiModel = "";
    });
    return sanitized;
  }

  function saveState(options) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithoutReleasedPayloads()));
    render();
    if (!options || options.sync !== false) scheduleRemoteSync();
  }

  function stateWithoutReleasedPayloads() {
    var safeState = structuredClone(state);
    safeState.listings.forEach(function (listing) {
      listing.aiEvaluation = null;
      listing.aiCandidate = null;
      listing.approvalDecision = null;
      listing.aiModel = "";
    });
    return safeState;
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

  function loadDocumentStage() {
    try {
      var value = JSON.parse(localStorage.getItem(DOCUMENT_STAGE_KEY) || "[]");
      return Array.isArray(value) ? value.slice(0, 3) : [];
    } catch (error) {
      return [];
    }
  }

  function saveDocumentStage(items) {
    try { localStorage.setItem(DOCUMENT_STAGE_KEY, JSON.stringify(items.slice(0, 3))); } catch (error) {}
  }

  function openDocumentDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("Private document staging is unavailable in this browser."));
        return;
      }
      var request = window.indexedDB.open(DOCUMENT_DB_NAME, 1);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(DOCUMENT_STORE_NAME)) {
          request.result.createObjectStore(DOCUMENT_STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Could not stage documents.")); };
    });
  }

  async function clearStagedDocuments(ids) {
    var targets = Array.isArray(ids) ? ids : loadDocumentStage().map(function (item) { return item.id; });
    if (targets.length) {
      try {
        var db = await openDocumentDb();
        await new Promise(function (resolve, reject) {
          var transaction = db.transaction(DOCUMENT_STORE_NAME, "readwrite");
          var store = transaction.objectStore(DOCUMENT_STORE_NAME);
          targets.forEach(function (id) { store.delete(id); });
          transaction.oncomplete = resolve;
          transaction.onerror = function () { reject(transaction.error); };
        });
        db.close();
      } catch (error) {}
    }
    var targetSet = new Set(targets);
    saveDocumentStage(loadDocumentStage().filter(function (item) { return !targetSet.has(item.id); }));
    renderDocumentSelection();
    updateRequestReview();
  }

  async function stageDocumentFiles(fileList) {
    var files = Array.from(fileList || []).slice(0, 3);
    if (!files.length) return;
    var invalid = files.find(function (file) {
      return file.type !== "application/pdf" || file.size <= 0 || file.size > 20 * 1024 * 1024;
    });
    if (invalid) {
      window.alert("Choose PDF files no larger than 20 MB each.");
      return;
    }
    await clearStagedDocuments();
    var records = files.map(function (file) {
      return {
        id: createId("document"),
        name: file.name,
        type: file.type,
        size: file.size,
        blob: file,
        createdAt: new Date().toISOString()
      };
    });
    var db = await openDocumentDb();
    await new Promise(function (resolve, reject) {
      var transaction = db.transaction(DOCUMENT_STORE_NAME, "readwrite");
      var store = transaction.objectStore(DOCUMENT_STORE_NAME);
      records.forEach(function (record) { store.put(record); });
      transaction.oncomplete = resolve;
      transaction.onerror = function () { reject(transaction.error || new Error("Could not stage documents.")); };
    });
    db.close();
    saveDocumentStage(records.map(function (record) {
      return { id: record.id, name: record.name, type: record.type, size: record.size };
    }));
    renderDocumentSelection();
    updateRequestReview();
    trackFunnel("documents_added", { documentCount: records.length });
  }

  function renderDocumentSelection() {
    var target = document.querySelector("[data-document-selection]");
    if (!target) return;
    var items = loadDocumentStage();
    if (!items.length) {
      target.textContent = "No documents selected.";
      return;
    }
    target.innerHTML = "<strong>Ready for secure upload after sign-in</strong><ul>" + items.map(function (item) {
      return "<li>" + escapeHtml(item.name) + " · " + Math.max(1, Math.round(item.size / 1024 / 1024)) + " MB</li>";
    }).join("") + "</ul>";
  }

  async function getStagedDocumentRecords(ids) {
    if (!ids || !ids.length) return [];
    var db = await openDocumentDb();
    var records = await Promise.all(ids.map(function (id) {
      return new Promise(function (resolve) {
        var request = db.transaction(DOCUMENT_STORE_NAME, "readonly").objectStore(DOCUMENT_STORE_NAME).get(id);
        request.onsuccess = function () { resolve(request.result || null); };
        request.onerror = function () { resolve(null); };
      });
    }));
    db.close();
    return records.filter(Boolean);
  }

  function safeDocumentName(value) {
    return String(value || "document.pdf").replace(/[^A-Za-z0-9._-]+/g, "-").slice(-100);
  }

  async function uploadListingDocuments(listing) {
    var stageIds = Array.isArray(listing.documentStageIds) ? listing.documentStageIds : [];
    if (!stageIds.length) return Array.isArray(listing.documentIds) ? listing.documentIds : [];
    var records = await getStagedDocumentRecords(stageIds);
    if (records.length !== stageIds.length) {
      throw new Error("Please reselect the PDFs for this request before running the analysis.");
    }
    if ((listing.documentIds || []).length + records.length > 3) {
      throw new Error("This request supports up to three PDFs. Start a revision after removing an earlier document.");
    }
    var documentIds = Array.isArray(listing.documentIds) ? listing.documentIds.slice() : [];
    for (var i = 0; i < records.length; i += 1) {
      var record = records[i];
      var storagePath = remote.user.id + "/" + listing.id + "/" + record.id + "-" + safeDocumentName(record.name);
      var upload = await remote.client.storage
        .from("home-buddy-private-documents")
        .upload(storagePath, record.blob, { contentType: record.type, upsert: false });
      if (upload.error) throw new Error("Document upload failed. Your request is still saved.");
      var metadata = await remote.client.from("home_buddy_documents").insert({
        owner_id: remote.user.id,
        workspace_id: remote.workspaceId || null,
        storage_path: storagePath,
        original_filename: record.name,
        media_type: record.type,
        byte_size: record.size
      }).select("id").single();
      if (metadata.error || !metadata.data) throw new Error("Document registration failed. Your request is still saved.");
      documentIds.push(metadata.data.id);
    }
    listing.documentIds = documentIds;
    listing.documentStageIds = [];
    await clearStagedDocuments(stageIds);
    trackFunnel("documents_added", { documentCount: documentIds.length, success: true });
    return documentIds;
  }

  function saveRequestDraft(form) {
    if (!form) return;
    try {
      var data = new FormData(form);
      localStorage.setItem(REQUEST_DRAFT_KEY, JSON.stringify({
        listingUrl: text(data.get("listingUrl")),
        listingAddress: text(data.get("listingAddress")),
        listingPrice: text(data.get("listingPrice")),
        listingQuestions: text(data.get("listingQuestions")),
        listingNotes: text(data.get("listingNotes")),
        decisionStage: text(data.get("decisionStage")),
        analysisDepthChoice: text(data.get("analysisDepthChoice"))
      }));
    } catch (error) {
      // Draft recovery is best-effort; submission remains available without storage.
    }
  }

  function clearRequestDraft(form, options) {
    try { localStorage.removeItem(REQUEST_DRAFT_KEY); } catch (error) {}
    if (form) form.reset();
    if (!options || options.preserveDocuments !== true) clearStagedDocuments();
    document.querySelectorAll("[data-question-prompt]").forEach(function (chip) {
      chip.setAttribute("aria-pressed", "false");
    });
    updateRequestReview();
  }

  function restoreRequestDraft(form) {
    if (!form) return;
    try {
      var draft = JSON.parse(localStorage.getItem(REQUEST_DRAFT_KEY) || "null");
      if (!draft) return;
      Object.keys(draft).forEach(function (name) {
        var field = form.elements[name];
        if (!field) return;
        if (field instanceof RadioNodeList) {
          Array.from(field).forEach(function (radio) { radio.checked = radio.value === draft[name]; });
        } else {
          field.value = draft[name] || "";
        }
      });
      var selectedDepth = form.querySelector('input[name="analysisDepthChoice"]:checked');
      if (selectedDepth && form.elements.analysisDepth) form.elements.analysisDepth.value = selectedDepth.value;
      renderDocumentSelection();
    } catch (error) {
      // Ignore malformed or unavailable private-browser storage.
    }
  }

  function updateRequestReview() {
    var form = document.querySelector("[data-listing-form]");
    if (!form) return;
    var data = new FormData(form);
    var home = text(data.get("listingAddress")) || text(data.get("listingUrl")) || "Add a listing link";
    var priorities = text(data.get("listingQuestions"));
    document.querySelectorAll("[data-review-home]").forEach(function (node) { node.textContent = home; });
    document.querySelectorAll("[data-review-priorities]").forEach(function (node) {
      node.textContent = priorities || "We’ll start with the listing and flag what still needs verification.";
    });
    var documents = loadDocumentStage();
    document.querySelectorAll("[data-review-documents]").forEach(function (node) {
      node.textContent = documents.length
        ? documents.length + " private PDF" + (documents.length === 1 ? "" : "s") + " ready to upload after sign-in."
        : "No documents added.";
    });
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

  function enrichListingFromUrl(listing) {
    if (!listing || listing.address || !listing.url) return listing;
    var parser = window.HomeSearchListingUrl;
    var parsed = parser && parser.parseListingUrl ? parser.parseListingUrl(listing.url) : null;
    if (parsed && parsed.address) listing.address = parsed.address;
    return listing;
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
        if (_event === "SIGNED_IN") trackFunnel("auth_completed", { method: "magic_link" });
        await loadRemoteWorkspace();
        await refreshRequestStatuses();
        flushFunnelEvents();
        if (!requestStatusTimer) {
          requestStatusTimer = window.setInterval(refreshRequestStatuses, 30000);
        }
        if (uiState.pendingAnalysisListingId) {
          var pendingListingId = uiState.pendingAnalysisListingId;
          uiState.pendingAnalysisListingId = null;
          saveUiState();
          requestAiEvaluation(pendingListingId);
        }
      } else {
        if (requestStatusTimer) {
          window.clearInterval(requestStatusTimer);
          requestStatusTimer = null;
        }
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
    if (uiState.authRetryAfter && Date.now() < uiState.authRetryAfter) {
      setRemoteStatus("Email limit reached. Please try again in about an hour.");
      return;
    }
    setRemoteStatus("Sending magic link");
    trackFunnel("auth_started", { method: "magic_link" });
    var result = await remote.client.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: config.redirectUrl
      }
    });
    if (result.error) {
      trackFunnel("auth_link_requested", { success: false });
      if (includesAny(result.error.message, ["rate limit", "too many"])) {
        uiState.authRetryAfter = Date.now() + (60 * 60 * 1000);
        saveUiState();
        setRemoteStatus("Email limit reached. Please try again in about an hour.");
      } else {
        setRemoteStatus("We couldn’t send the sign-in email. Please try again.");
      }
      return;
    }
    uiState.authRetryAfter = null;
    saveUiState();
    setRemoteStatus("Magic link sent");
    trackFunnel("auth_link_requested", { success: true });
    trackFunnel("auth_link_sent", { method: "magic_link" });
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
    state.listings.forEach(function (listing) {
      listing.aiEvaluation = null;
      listing.aiCandidate = null;
      listing.approvalDecision = null;
      listing.aiModel = "";
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithoutReleasedPayloads()));
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
      state = sanitizeLoadedState(Object.assign({}, structuredClone(defaultState), remoteState));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithoutReleasedPayloads()));
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

    var cloudState = stateWithoutReleasedPayloads();
    var payload = {
      owner_id: remote.user.id,
      title: title,
      app_state: cloudState
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
    enrichListingFromUrl(listing);

    var config = getAiConfig();
    if (!config.endpoint) {
      listing.aiStatus = "Configure the AI backend endpoint first.";
      saveState();
      return;
    }
    if (!remote.client || !remote.user) {
      listing.aiStatus = "Sign in before running server AI.";
      saveState();
      setActiveView("account");
      return;
    }

    listing.aiStatus = "Running server AI evaluation";
    uiState.pendingAnalysisListingId = null;
    uiState.activeListingId = listing.id;
    saveUiState();
    setActiveView("processing");
    trackFunnel("request_started", {
      decisionStage: listing.decisionStage || "considering-tour",
      depth: listing.analysisDepth || "decision-brief",
      documentCount: (listing.documentStageIds || []).length + (listing.documentIds || []).length
    });
    saveState();

    try {
      if (listing.documentStageIds && listing.documentStageIds.length) {
        listing.aiStatus = "Securely uploading your documents";
        saveState();
      }
      var documentIds = await uploadListingDocuments(listing);
      listing.aiStatus = "Running server AI evaluation";
      saveState();
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
          documentIds: documentIds,
          rubricVersion: "home-evaluation:v1"
        })
      });
      var data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "AI evaluation failed");
      }
      listing.aiCandidate = data.evaluation || null;
      listing.aiEvaluationId = data.evaluationId || null;
      listing.aiRequestId = data.requestId || listing.aiRequestId || null;
      listing.requestStatus = data.requestStatus || null;
      listing.safeStatusMessage = data.safeStatusMessage || "";
      listing.aiModel = data.model || "";
      listing.approvalDecision = data.approvalDecision || null;
      if (listing.approvalDecision && listing.approvalDecision.outcome === "auto_approved") {
        listing.aiEvaluation = data.evaluation;
        listing.aiStatus = "Evidence-checked Decision Brief approved";
      } else {
        listing.aiEvaluation = null;
        listing.aiStatus = approvalStatusCopy(listing.approvalDecision);
      }
      trackFunnel("report_ready", {
        requestId: listing.aiRequestId,
        evidenceStatus: listing.approvalDecision && listing.approvalDecision.outcome
          ? listing.approvalDecision.outcome
          : "missing_decision",
        depth: listing.analysisDepth || "decision-brief"
      });
      saveState();
      setActiveView("results", { focus: true });
    } catch (error) {
      listing.aiStatus = "AI failed: " + (error && error.message ? error.message : "Unknown error");
      trackFunnel("analysis_failed", { retryable: true });
      saveState();
      setActiveView("results", { focus: true });
    }
  }

  async function refreshRequestStatuses() {
    if (!remote.client || !remote.user) return;
    var requestIds = state.listings
      .map(function (listing) { return listing.aiRequestId; })
      .filter(Boolean);
    if (!requestIds.length) return;

    var requestResponse = await remote.client
      .from("home_buddy_evaluation_requests")
      .select("id,status,safe_status_message,released_at,updated_at")
      .in("id", requestIds);
    if (requestResponse.error) return;

    var releasedResponse = await remote.client
      .from("home_buddy_released_results")
      .select("request_id,result_payload,approval_manifest,released_at,version")
      .in("request_id", requestIds)
      .is("withdrawn_at", null)
      .order("version", { ascending: false });
    var releasedRows = releasedResponse.error ? [] : (releasedResponse.data || []);

    (requestResponse.data || []).forEach(function (requestRow) {
      var listing = state.listings.find(function (item) {
        return item.aiRequestId === requestRow.id;
      });
      if (!listing) return;
      listing.requestStatus = requestRow.status;
      listing.safeStatusMessage = requestRow.safe_status_message;
      var released = releasedRows.find(function (row) {
        return row.request_id === requestRow.id;
      });
      if (released) {
        listing.aiEvaluation = released.result_payload;
        listing.approvalDecision = released.approval_manifest;
        listing.aiStatus = "Reviewed decision packet ready";
      } else {
        listing.aiEvaluation = null;
        listing.approvalDecision = null;
        if (requestRow.status === "in_review" || requestRow.status === "needs_buyer_input" || requestRow.status === "failed") {
          listing.aiStatus = requestRow.safe_status_message;
        } else if (requestRow.status === "withdrawn") {
          listing.aiStatus = "This reviewed report is no longer available.";
        }
      }
    });
    saveState();
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
    var existingListing = uiState.editingListingId && state.listings.find(function (item) {
      return item.id === uiState.editingListingId;
    });
    var listing = Object.assign(existingListing || {}, {
      id: existingListing ? existingListing.id : "listing-" + Date.now(),
      url: text(formData.get("listingUrl")),
      address: text(formData.get("listingAddress")),
      price: text(formData.get("listingPrice")),
      notes: text(formData.get("listingNotes")),
      questions: text(formData.get("listingQuestions")),
      decisionStage: text(formData.get("decisionStage")),
      analysisDepth: text(formData.get("analysisDepth")),
      documentStageIds: loadDocumentStage().map(function (item) { return item.id; }),
      documentNames: loadDocumentStage().map(function (item) { return item.name; }),
      documentIds: existingListing && Array.isArray(existingListing.documentIds) ? existingListing.documentIds : [],
      createdAt: existingListing ? existingListing.createdAt : new Date().toISOString(),
      debriefs: existingListing ? existingListing.debriefs : []
    });
    listing.review = buildListingReview(listing);
    if (!existingListing) state.listings.unshift(listing);
    uiState.editingListingId = null;
    uiState.activeListingId = listing.id;
    saveUiState();
    trackFunnel("listing_submitted", {
      sourceCategory: includesAny(listing.url, ["redfin"]) ? "redfin" : (listing.url ? "other_url" : "address"),
      inputType: listing.url ? "url" : "address"
    });
    trackFunnel("listing_validated", {
      sourceCategory: includesAny(listing.url, ["redfin"]) ? "redfin" : (listing.url ? "other_url" : "address"),
      hasUrl: Boolean(listing.url),
      completeness: listing.address && listing.price ? "complete" : "partial"
    });
    saveState();
    clearRequestDraft(form, { preserveDocuments: true });
    setActiveView("results");
    var listingSection = document.querySelector("#listings");
    if (listingSection) listingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return listing;
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
    renderGuidedExperience();
  }

  function getActiveListing() {
    var active = state.listings.find(function (item) {
      return item.id === uiState.activeListingId;
    });
    return active || state.listings[0] || null;
  }

  function getAnalysisPresentation(listing) {
    if (!listing) {
      return {
        stage: "ready",
        title: "Ready for your first home",
        detail: "Paste a listing to start a private decision review.",
        progress: 0
      };
    }
    if (listing.requestStatus === "in_review") {
      return {
        stage: "review",
        title: "Reviewing the evidence",
        detail: listing.safeStatusMessage || "The analysis is complete and we’re checking the evidence before sharing it.",
        progress: 82
      };
    }
    if (listing.requestStatus === "needs_buyer_input") {
      return {
        stage: "needs_input",
        title: "One detail would strengthen your report",
        detail: listing.safeStatusMessage || "We need more information before we can responsibly finish the report.",
        progress: 72
      };
    }
    if (listing.requestStatus === "ready" && listing.aiEvaluation) {
      return {
        stage: "complete",
        title: "Your reviewed decision packet is ready",
        detail: "Open the result to review the evidence, unknowns, and next actions.",
        progress: 100
      };
    }
    if (listing.requestStatus === "failed") {
      return {
        stage: "failed",
        title: "We couldn’t finish this report",
        detail: listing.safeStatusMessage || "Your request is saved while we review what went wrong.",
        progress: 100
      };
    }
    if (listing.approvalDecision) {
      var outcome = listing.approvalDecision.outcome;
      if (outcome === "auto_approved") {
        return {
          stage: "complete",
          title: "Your Decision Brief is ready",
          detail: "Required automated checks passed. Review the evidence and remaining limits.",
          progress: 100
        };
      }
      return {
        stage: "exception",
        title: outcome === "insufficient_evidence" ? "More evidence is needed" : "This brief needs review",
        detail: approvalStatusCopy(listing.approvalDecision),
        progress: 100
      };
    }
    if (includesAny(listing.aiStatus, ["running", "checking", "building", "validating"])) {
      return {
        stage: "processing",
        title: "We’re checking the property",
        detail: "We’re organizing the available evidence and validating the decision brief.",
        progress: 58
      };
    }
    if (includesAny(listing.aiStatus, ["failed", "interrupted"])) {
      return {
        stage: "failed",
        title: "The analysis was interrupted",
        detail: "Your local screening read is safe. You can try the private analysis again.",
        progress: 100
      };
    }
    return {
      stage: "local",
      title: "Your local screening read is ready",
      detail: isAiReady()
        ? "Create an evidence-checked brief when you want the deeper private analysis."
        : "Sign in to create a private, evidence-checked brief.",
      progress: 25
    };
  }

  function renderGuidedExperience() {
    var listing = getActiveListing();
    var presentation = getAnalysisPresentation(listing);
    document.querySelectorAll("[data-returning-home]").forEach(function (node) {
      node.hidden = !state.listings.length;
    });
    document.querySelectorAll("[data-active-listing-title]").forEach(function (node) {
      node.textContent = listing ? (listing.address || listing.url || "Your home") : "Your home";
    });
    document.querySelectorAll("[data-analysis-status], [data-processing-status]").forEach(function (node) {
      node.textContent = presentation.title;
      node.dataset.state = presentation.stage;
    });
    document.querySelectorAll("[data-analysis-status-detail], [data-processing-detail]").forEach(function (node) {
      node.textContent = presentation.detail;
    });
    document.querySelectorAll("[data-analysis-progress], [data-processing-progress]").forEach(function (node) {
      node.style.width = presentation.progress + "%";
      node.setAttribute("aria-valuenow", String(presentation.progress));
    });
    document.querySelectorAll("[data-analysis-stage]").forEach(function (node) {
      var stage = node.getAttribute("data-analysis-stage");
      var stageOrder = ["ready", "local", "processing", "complete"];
      var current = stageOrder.indexOf(presentation.stage);
      var position = stageOrder.indexOf(stage);
      var done = current !== -1 && position !== -1 && position <= current;
      node.dataset.state = done ? "done" : (stage === presentation.stage ? "active" : "upcoming");
    });
  }

  function renderAuth() {
    var accountState = document.querySelector("[data-account-state]");
    var syncStatus = document.querySelector("[data-sync-status]");
    var authEmail = document.querySelector("[data-auth-email]");
    var authDetail = document.querySelector("[data-auth-detail]");
    var authForm = document.querySelector("[data-auth-form]");
    var authActions = document.querySelector("[data-auth-actions]");
    var authSubmit = authForm ? authForm.querySelector('button[type="submit"]') : null;
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
    if (authSubmit) {
      var retryBlocked = Boolean(uiState.authRetryAfter && Date.now() < uiState.authRetryAfter);
      authSubmit.disabled = retryBlocked;
      authSubmit.textContent = retryBlocked ? "Try again in about an hour" : "Email me a sign-in link";
    }
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
        '<div class="polished-empty">',
        '<span aria-hidden="true">⌂</span>',
        "<h2>No homes yet</h2>",
        "<p>Add a home to create your first buyer-specific decision packet.</p>",
        '<button class="button coral" type="button" data-view-target="request" data-new-request>Analyze a home</button>',
        "</div>"
      ].join("");
      return;
    }
    target.innerHTML = state.listings.map(function (listing) {
      var review = listing.review || buildListingReview(listing);
      if (!review.skillEvaluation) review.skillEvaluation = buildSkillEvaluation(listing, review);
      var skillEvaluation = review.skillEvaluation;
      var hasEvidenceResult = Boolean(listing.aiEvaluation);
      var releasedCandidate = hasEvidenceResult ? listing.aiEvaluation : null;
      var decisionIntro = hasEvidenceResult
        ? '<div class="decision-summary"><p class="decision-summary-copy">' + escapeHtml(releasedCandidate.decisionRead || "Reviewed decision packet") + '</p></div>'
        : [
          '<div class="request-saved-summary">',
          "<strong>Your request is saved.</strong>",
          "<p>We’ve organized the questions that matter. Run the private evidence check before treating this as a recommendation.</p>",
          "</div>"
        ].join("");
      var preliminaryQuestions = hasEvidenceResult ? [
        '<div class="decision-priority-grid">',
        priorityList("Buyer fit", [candidateSection(releasedCandidate, "buyer_fit")], "strength"),
        priorityList("Risks and unknowns", [candidateSection(releasedCandidate, "risks_unknowns")], "risk"),
        priorityList("What to do next", [candidateSection(releasedCandidate, "questions_actions")], "action"),
        "</div>"
      ].join("") : [
        '<div class="decision-priority-grid preliminary-grid">',
        priorityList("Questions to test", review.concerns, "risk"),
        priorityList("Evidence to gather", review.diligence, "action"),
        "</div>"
      ].join("");
      return [
        '<article class="listing-card decision-card">',
        '<div class="listing-card-head">',
        "<div>",
        '<span class="decision-card-label">' + (hasEvidenceResult ? "Evidence-checked decision packet" : "Request saved · Evidence check pending") + "</span>",
        "<h3>" + escapeHtml(listing.address || listing.url || "Untitled listing") + "</h3>",
        '<p class="muted-line">' + escapeHtml([listing.price, dateLabel(listing.createdAt)].filter(Boolean).join(" · ")) + "</p>",
        "</div>",
        hasEvidenceResult ? '<span class="score-pill">Reviewed</span>' : "",
        "</div>",
        decisionIntro,
        preliminaryQuestions,
        renderAiEvaluationAction(listing),
        hasEvidenceResult ? renderApprovalDecision(listing) : "",
        listing.aiEvaluation ? renderApprovedEvaluation(listing.aiEvaluation) : "",
        hasEvidenceResult ? "" : [
          '<details class="report-details">',
          "<summary>See the preliminary question map</summary>",
          renderSkillEvaluation(skillEvaluation),
          "</details>"
        ].join(""),
        '<div class="decision-actions">',
        '<button class="button secondary" type="button" data-view-target="debrief" data-debrief-listing-id="' + escapeHtml(listing.id) + '">I toured this home</button>',
        '<button class="button secondary" type="button" data-view-target="request" data-new-request>Compare another home</button>',
        "</div>",
        listing.debriefs.length ? reviewList("Latest debrief", [listing.debriefs[0].summary, listing.debriefs[0].nextStep]) : "",
        "</article>"
      ].join("");
    }).join("");
  }

  function priorityList(title, items, kind) {
    var list = (items || []).slice(0, 3).map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");
    return [
      '<section class="decision-priority" data-kind="' + escapeHtml(kind) + '">',
      "<strong>" + escapeHtml(title) + "</strong>",
      "<ul>" + (list || "<li>No signal yet.</li>") + "</ul>",
      "</section>"
    ].join("");
  }

  function candidateSection(candidate, id) {
    var sections = candidate && Array.isArray(candidate.sections) ? candidate.sections : [];
    var section = sections.find(function (item) { return item.id === id; });
    return section && section.content ? section.content : "No released finding in this section.";
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
    var buttonLabel = hasAi ? "Refresh evidence check" : "Run the deeper evidence check";
    var hint = !endpoint
      ? "The deeper private analysis is temporarily unavailable."
      : (!remote.user ? "Sign in to save this home and begin the private analysis." : "We’ll clearly label what is verified, inferred, or still unknown.");
    if (listing.aiStatus) hint = listing.aiStatus;
    var button;
    if (listing.requestStatus === "in_review") {
      button = '<span class="status-pill request-reviewing">Reviewing the evidence</span>';
      hint = listing.safeStatusMessage || "We’ll make the reviewed report available here when it is ready.";
    } else if (listing.requestStatus === "ready" && listing.aiEvaluation) {
      button = '<span class="status-pill request-ready">Report ready</span>';
      hint = "This is the reviewed version released for you.";
    } else if (listing.requestStatus === "needs_buyer_input") {
      button = '<button class="button coral" type="button" data-add-request-context="' + escapeHtml(listing.id) + '">Add the missing detail</button>';
      hint = listing.safeStatusMessage || "Add context and run the evidence check again.";
    } else if (listing.requestStatus === "failed" && ready) {
      button = '<button class="button coral" type="button" data-run-ai-evaluation="' + escapeHtml(listing.id) + '">Try analysis again</button>';
      hint = listing.safeStatusMessage || "Your request is saved. You can safely try again.";
    } else if (ready) {
      button = '<button class="button coral" type="button" data-run-ai-evaluation="' + escapeHtml(listing.id) + '">' + escapeHtml(buttonLabel) + "</button>";
    } else if (endpoint && !remote.user) {
      button = '<button class="button coral" type="button" data-prepare-auth="' + escapeHtml(listing.id) + '" data-view-target="account">Sign in to continue</button>';
    } else {
      button = '<button class="button secondary" type="button" disabled>' + escapeHtml(buttonLabel) + "</button>";
    }
    return [
      '<div class="ai-action" role="status">',
      button,
      "<span>" + escapeHtml(hint) + "</span>",
      "</div>"
    ].join("");
  }

  function renderApprovalDecision(listing) {
    var decision = listing.approvalDecision;
    if (!decision) return "";
    var labels = {
      auto_approved: "Evidence check complete",
      needs_review: "Some evidence still needs review",
      insufficient_evidence: "More evidence is needed",
      failed: "We couldn’t finish the evidence check"
    };
    var reasons = Array.isArray(decision.reasonCodes) ? decision.reasonCodes : [];
    return [
      '<section class="approval-panel" data-outcome="' + escapeHtml(decision.outcome) + '">',
      '<div><span>Evidence status</span><strong>' + escapeHtml(labels[decision.outcome] || "Not released") + "</strong></div>",
      "<p>" + escapeHtml(approvalStatusCopy(decision)) + "</p>",
      reasons.length ? '<details class="approval-reasons"><summary>Why this status?</summary><p>' + escapeHtml(reasons.join(", ")) + "</p></details>" : "",
      decision.decidedAt ? "<small>Validated " + escapeHtml(dateLabel(decision.decidedAt)) + "</small>" : "",
      "</section>"
    ].join("");
  }

  function renderApprovedEvaluation(evaluation) {
    if (evaluation && evaluation.schemaVersion === "decision-pack:v1") {
      var sources = Array.isArray(evaluation.sources) ? evaluation.sources : [];
      return [
        '<div class="approved-divider"><span>Evidence-checked findings</span></div>',
        '<section class="released-candidate" aria-label="Reviewed decision packet">',
        '<div class="released-sections">',
        (evaluation.sections || []).map(function (section) {
          return '<article><h3>' + escapeHtml(String(section.id || "").replaceAll("_", " ")) + '</h3><p>' + escapeHtml(section.content) + "</p></article>";
        }).join(""),
        "</div>",
        sources.length ? '<details class="released-sources"><summary>Sources and checked dates</summary><ul>' + sources.map(function (source) {
          return '<li><a href="' + escapeHtml(source.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(source.title) + "</a>" +
            (source.retrievedAt ? " · checked " + escapeHtml(dateLabel(source.retrievedAt)) : "") + "</li>";
        }).join("") + "</ul></details>" : "",
        "<p class=\"evidence-boundary\">" + escapeHtml(evaluation.disclaimer) + "</p>",
        "</section>"
      ].join("");
    }
    return [
      '<div class="approved-divider"><span>Evidence-checked findings</span></div>',
      renderSkillEvaluation(evaluation)
    ].join("");
  }

  function renderSkillEvaluation(evaluation) {
    if (!evaluation) return "";
    return [
      '<section class="skill-evaluation" aria-label="Detailed home analysis">',
      '<div class="skill-header">',
      "<span>Detailed analysis</span>",
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
    var urlEntry = document.querySelector("[data-url-entry]");
    if (urlEntry) {
      urlEntry.addEventListener("submit", function (event) {
        event.preventDefault();
        var heroUrl = document.querySelector("#heroListingUrl");
        var listingUrl = document.querySelector("#listingUrl");
        if (!heroUrl || !listingUrl || !heroUrl.reportValidity()) return;
        listingUrl.value = text(heroUrl.value);
        trackFunnel("listing_url_entered", {
          source: includesAny(heroUrl.value, ["redfin"]) ? "redfin" : "other"
        });
        setRequestStep(2, { track: false });
        document.querySelectorAll("[data-request-summary-home]").forEach(function (node) {
          node.textContent = text(heroUrl.value);
        });
        setActiveView("request", { focus: true });
      });
    }

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
      var listing = reviewListing(event.currentTarget);
      var submitter = event.submitter;
      if (submitter && submitter.hasAttribute("data-submit-analysis")) {
        if (isAiReady()) {
          requestAiEvaluation(listing.id);
        } else {
          uiState.pendingAnalysisListingId = listing.id;
          saveUiState();
          setActiveView("account");
          trackFunnel("auth_gate_viewed", { source: "first_request" });
        }
      }
    });

    var requestForm = document.querySelector("[data-listing-form]");
    restoreRequestDraft(requestForm);
    updateRequestReview();
    renderDocumentSelection();
    var documentInput = document.querySelector("[data-document-input]");
    if (documentInput) {
      documentInput.addEventListener("change", function () {
        stageDocumentFiles(documentInput.files).catch(function () {
          window.alert("We couldn’t safely stage those documents. Your other request details are still saved.");
          documentInput.value = "";
        });
      });
    }
    if (requestForm) {
      requestForm.addEventListener("input", function () {
        saveRequestDraft(requestForm);
        updateRequestReview();
      });
      requestForm.addEventListener("change", function () {
        saveRequestDraft(requestForm);
        updateRequestReview();
      });
    }

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

    document.querySelectorAll("[data-question-prompt]").forEach(function (button) {
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", function () {
        var field = document.querySelector("#listingQuestions");
        var prompt = button.getAttribute("data-question-prompt");
        var selected = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", selected ? "false" : "true");
        if (selected && field) {
          field.value = field.value
            .split("\n")
            .filter(function (line) { return line.indexOf(prompt + ":") !== 0; })
            .join("\n")
            .trim();
        }
        if (!selected && field && !includesAny(field.value, [prompt])) {
          field.value = (field.value ? field.value.replace(/\s+$/, "") + "\n" : "") + prompt + ": ";
          field.focus();
        }
      });
    });

    document.querySelectorAll('input[name="analysisDepthChoice"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        var depth = document.querySelector("#analysisDepth");
        if (depth && radio.checked) depth.value = radio.value;
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
      var viewButton = event.target.closest("[data-view-target], [data-nav-view]");
      var prepareAuth = event.target.closest("[data-prepare-auth]");
      var debriefButton = event.target.closest("[data-debrief-listing-id]");
      var nextStep = event.target.closest("[data-request-next]");
      var previousStep = event.target.closest("[data-request-back]");
      var addRequestContext = event.target.closest("[data-add-request-context]");
      var editRequest = event.target.closest("[data-edit-request]");
      if (accept) acceptSuggestion(accept.getAttribute("data-accept-suggestion"));
      if (reject) rejectSuggestion(reject.getAttribute("data-reject-suggestion"));
      if (aiButton) requestAiEvaluation(aiButton.getAttribute("data-run-ai-evaluation"));
      if (addRequestContext) {
        var contextListing = state.listings.find(function (item) { return item.id === addRequestContext.getAttribute("data-add-request-context"); });
        var contextForm = document.querySelector("[data-listing-form]");
        if (contextListing && contextForm) {
          uiState.editingListingId = contextListing.id;
          saveUiState();
          contextForm.elements.listingUrl.value = contextListing.url || "";
          contextForm.elements.listingAddress.value = contextListing.address || "";
          contextForm.elements.listingPrice.value = contextListing.price || "";
          contextForm.elements.listingQuestions.value = contextListing.questions || "";
          contextForm.elements.listingNotes.value = contextListing.notes || "";
          saveRequestDraft(contextForm);
          updateRequestReview();
          setRequestStep(3, { track: false });
          setActiveView("request", { focus: true });
        }
      }
      if (prepareAuth) {
        uiState.pendingAnalysisListingId = prepareAuth.getAttribute("data-prepare-auth");
        uiState.activeListingId = uiState.pendingAnalysisListingId;
        saveUiState();
      }
      if (debriefButton) {
        uiState.activeListingId = debriefButton.getAttribute("data-debrief-listing-id");
        saveUiState();
        var debriefSelect = document.querySelector("[data-debrief-listing]");
        if (debriefSelect) debriefSelect.value = uiState.activeListingId;
      }
      if (viewButton) {
        var view = viewButton.getAttribute("data-view-target") || viewButton.getAttribute("data-nav-view");
        if (view === "request") {
          if (viewButton.hasAttribute("data-new-request")) {
            uiState.editingListingId = null;
            saveUiState();
            clearRequestDraft(document.querySelector("[data-listing-form]"));
          }
          setRequestStep(1, { track: false });
        }
        setActiveView(view, { focus: true });
      }
      if (nextStep) {
        var currentPanel = nextStep.closest("[data-request-step]");
        var fields = currentPanel ? currentPanel.querySelectorAll("input, textarea, select") : [];
        var valid = Array.from(fields).every(function (field) {
          return field.reportValidity();
        });
        if (valid) setRequestStep(uiState.requestStep + 1);
      }
      if (previousStep) {
        if (uiState.requestStep <= 1) {
          setActiveView("landing", { focus: true });
        } else {
          setRequestStep(uiState.requestStep - 1);
        }
      }
      if (editRequest) setRequestStep(1);
    });

    var listingUrl = document.querySelector("#listingUrl");
    if (listingUrl) {
      var updateDraftSummary = function () {
        document.querySelectorAll("[data-request-summary-home]").forEach(function (node) {
          node.textContent = text(listingUrl.value) || "Paste a listing to begin";
        });
      };
      listingUrl.addEventListener("change", function () {
        if (!text(listingUrl.value)) return;
        updateDraftSummary();
        trackFunnel("listing_url_entered", {
          source: includesAny(listingUrl.value, ["redfin"]) ? "redfin" : "other"
        });
      });
      listingUrl.addEventListener("input", updateDraftSummary);
    }

    var listingQuestions = document.querySelector("#listingQuestions");
    if (listingQuestions) {
      listingQuestions.addEventListener("input", function () {
        var hasContext = Boolean(text(listingQuestions.value));
        document.querySelectorAll("[data-request-summary-priorities]").forEach(function (node) {
          node.textContent = hasContext
            ? "Your priorities are included in this request."
            : "We’ll tailor the research to your specific questions.";
        });
      });
    }

    window.addEventListener("hashchange", function () {
      var hashView = window.location.hash.replace(/^#/, "");
      if (document.querySelector('[data-view="' + hashView + '"]')) {
        setActiveView(hashView, { track: false });
      }
    });
  }

  function initializeGuidedExperience() {
    var views = document.querySelectorAll("[data-view]");
    if (views.length) {
      var hashView = window.location.hash.replace(/^#/, "");
      var defaultView = document.querySelector('[data-view="' + hashView + '"]')
        ? hashView
        : (uiState.activeView || views[0].getAttribute("data-view"));
      if (!document.querySelector('[data-view="' + defaultView + '"]')) {
        defaultView = views[0].getAttribute("data-view");
      }
      setActiveView(defaultView, { track: false });
    }
    if (document.querySelector("[data-request-step]")) {
      setRequestStep(uiState.requestStep, { track: false });
    }
    trackFunnel("landing_view", {
      returning: Boolean(state.listings.length || state.brief || hasWorkspaceFrame()),
      signedIn: Boolean(remote.user),
      referrerCategory: document.referrer ? "external_or_internal" : "direct"
    });
  }

  if (typeof structuredClone !== "function") {
    window.structuredClone = function (value) {
      return JSON.parse(JSON.stringify(value));
    };
  }

  applyProductBrand();
  setupVoice();
  bindEvents();
  render();
  initializeGuidedExperience();
  setupSupabase().catch(function (error) {
    setRemoteStatus("Supabase setup failed: " + error.message);
  });
}());
