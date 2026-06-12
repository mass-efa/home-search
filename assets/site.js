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

    form.addEventListener("submit", function (event) {
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
      issueLink.href = url.toString();
      result.classList.add("is-visible");
      issueLink.focus();
    });
  }

  loadHomeList();
  setupRequestForm();
}());
