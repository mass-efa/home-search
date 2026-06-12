(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugFrom(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/https?:\/\//g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "home-evaluation-request";
  }

  function parseSection(body, heading) {
    var pattern = new RegExp("## " + heading + "\\n([\\s\\S]*?)(?=\\n## |$)", "i");
    var match = String(body || "").match(pattern);
    return match ? match[1].trim() : "";
  }

  async function loadHomeList() {
    var target = document.querySelector("[data-home-list]");
    if (!target) return;

    try {
      var response = await fetch(target.getAttribute("data-src") || "data/homes.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load home list");
      var homes = await response.json();

      if (!homes.length) {
        target.innerHTML = "<p>No published evaluations yet.</p>";
        return;
      }

      target.innerHTML = homes.map(function (home) {
        var tags = (home.tags || []).map(function (tag) {
          return '<span class="tag">' + escapeHtml(tag) + "</span>";
        }).join("");

        return [
          '<article class="home-card">',
          "<h3>" + escapeHtml(home.title) + "</h3>",
          "<p>" + escapeHtml(home.summary) + "</p>",
          '<div class="home-meta">',
          '<span class="tag">' + escapeHtml(home.status) + "</span>",
          '<span class="tag">' + escapeHtml(home.price) + "</span>",
          tags,
          "</div>",
          '<p><a class="button secondary" href="' + escapeHtml(home.href) + '">Open brief</a></p>',
          "</article>"
        ].join("");
      }).join("");
    } catch (error) {
      target.innerHTML = "<p>Could not load published evaluations.</p>";
    }
  }

  function setupRequestForm() {
    var form = document.querySelector("[data-request-form]");
    if (!form) return;

    var result = document.querySelector("[data-generated-link]");
    var output = document.querySelector("[data-request-body]");
    var issueLink = document.querySelector("[data-issue-link]");
    var fallbackCopy = document.querySelector("[data-fallback-copy]");
    var directCopy = document.querySelector("[data-direct-copy]");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var listingUrl = String(data.get("listingUrl") || "").trim();
      var address = String(data.get("address") || "").trim();
      var price = String(data.get("price") || "").trim();
      var notes = String(data.get("notes") || "").trim();
      var titleTarget = address || listingUrl || "home evaluation request";
      var title = "Evaluate: " + titleTarget;
      var slug = slugFrom(address || listingUrl);

      var body = [
        "<!-- home-evaluation-request -->",
        "",
        "## Listing URL",
        listingUrl || "_Not provided_",
        "",
        "## Address",
        address || "_Not provided_",
        "",
        "## Known price / status",
        price || "_Not provided_",
        "",
        "## Buyer notes",
        notes || "_None provided_",
        "",
        "## Requested output",
        "- Run the `home-evaluation` skill.",
        "- Generate a public HTML brief.",
        "- Publish it under `homes/" + slug + ".html`.",
        "- Add the result to `data/homes.json` so it appears on the homepage.",
        "",
        "## Privacy check",
        "- This request is public because it is submitted through GitHub Issues.",
        "- Do not include private financing, personal identity, or negotiation limits unless they are intentionally public."
      ].join("\n");

      var url = new URL("https://github.com/mass-efa/home-search/issues/new");
      url.searchParams.set("title", title);
      url.searchParams.set("body", body);

      output.value = body;
      issueLink.textContent = "Open GitHub issue";
      issueLink.href = url.toString();

      var endpoint = window.HOME_SEARCH_SUBMIT_ENDPOINT || "";
      if (endpoint) {
        try {
          var response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title,
              listingUrl: listingUrl,
              address: address,
              price: price,
              notes: notes,
              slug: slug,
              body: body
            })
          });
          if (!response.ok) throw new Error("Request failed");
          var payload = await response.json();
          if (payload.issueUrl) {
            issueLink.href = payload.issueUrl;
            issueLink.textContent = "Open submitted request";
          }
          if (fallbackCopy) fallbackCopy.hidden = true;
          if (directCopy) directCopy.hidden = false;
        } catch (error) {
          if (fallbackCopy) fallbackCopy.hidden = false;
          if (directCopy) directCopy.hidden = true;
        }
      } else {
        if (fallbackCopy) fallbackCopy.hidden = false;
        if (directCopy) directCopy.hidden = true;
      }

      result.classList.add("is-visible");
      issueLink.focus();
    });
  }

  async function loadRequestStatus() {
    var target = document.querySelector("[data-request-status]");
    if (!target) return;

    try {
      var response = await fetch("https://api.github.com/repos/mass-efa/home-search/issues?state=all&labels=home-evaluation&per_page=50", {
        headers: { "Accept": "application/vnd.github+json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Unable to load request status");
      var issues = await response.json();

      if (!issues.length) {
        target.innerHTML = "<p>No evaluation requests yet.</p>";
        return;
      }

      target.innerHTML = issues.map(function (issue) {
        var labels = issue.labels || [];
        var labelNames = labels.map(function (label) { return label.name; });
        var isPublished = labelNames.indexOf("published") !== -1 || issue.state === "closed";
        var isAnalyzing = labelNames.indexOf("analyzing") !== -1;
        var stateLabel = isPublished ? "Published / closed" : (isAnalyzing ? "Analyzing" : "Queued");
        var stateClass = isPublished ? "published" : (isAnalyzing ? "ready" : "open");
        var address = parseSection(issue.body, "Address");
        var listingUrl = parseSection(issue.body, "Listing URL");
        var created = issue.created_at ? new Date(issue.created_at).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        }) : "";

        return [
          '<article class="status-card">',
          "<h3>" + escapeHtml(issue.title) + "</h3>",
          "<p>" + escapeHtml(address && address !== "_Not provided_" ? address : listingUrl) + "</p>",
          '<div class="home-meta">',
          '<span class="tag ' + stateClass + '">' + escapeHtml(stateLabel) + "</span>",
          created ? '<span class="tag">Submitted ' + escapeHtml(created) + "</span>" : "",
          "</div>",
          '<p style="margin-top:12px;"><a class="button secondary" href="' + escapeHtml(issue.html_url) + '">Open request</a></p>',
          "</article>"
        ].join("");
      }).join("");
    } catch (error) {
      target.innerHTML = '<p class="error-text">Could not load request status from GitHub right now.</p>';
    }
  }

  loadHomeList();
  loadRequestStatus();
  setupRequestForm();
}());
