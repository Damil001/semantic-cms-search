/**
 * Webflow CMS semantic search — Finsweet-style attributes, no build step.
 *
 * Preferred: install from Talaash Setup (Webflow Custom Code API registers this
 * script site-wide with data-search-site / data-search-token / data-search-endpoint).
 * Default widget CSS is inlined (no separate search.css fetch / SRI gap).
 *
 * Opt-out analytics ids: data-search-analytics="off" on root or script.
 * Opt-out suggest: data-search-suggest="off" on root (typed text not sent to /suggest).
 *
 * Build the page in Designer (Divs, Form Search, Collection List, Buttons).
 * Add custom attributes. This script clones your designed Collection Item.
 *
 * Root:     data-search  +  data-search-endpoint  (or fs-cmssearch-element=root)
 *           data-search-site  +  data-search-token  (from /app — required)
 * Input:    data-search-input
 * List:     data-search-results   (put this on the Collection List)
 * Item:     data-search-result    (put this on the Collection Item — template)
 * Fields:   data-search-result-title | -type | -snippet | -image
 * Answer:   data-search-answer    (optional — AI intro text)
 * Suggest:  data-search-suggest   (optional — autocomplete panel; auto-created if missing)
 * States:   data-search-loading | data-search-empty
 * Filters:  data-search-filter="blog"
 * Mode:     data-search-mode="submit" (default, Enter to search) | "live" (suggest while typing; Enter runs full search)
 * Submit:   data-search-submit  (optional button; form submit also works)
 */
(function () {
  "use strict";

  var DEBOUNCE_MS = 250;
  var SUGGEST_DEBOUNCE_MS = 200;
  var SUGGEST_MIN_CHARS = 2;
  var DEFAULT_MODE = "submit";
  /** Captured while the script executes (Custom Code / footer inject). */
  var BOOT_SCRIPT = document.currentScript;

  function scriptBootAttr(name) {
    return BOOT_SCRIPT && BOOT_SCRIPT.getAttribute
      ? BOOT_SCRIPT.getAttribute(name)
      : null;
  }

  function scriptDefaultEndpoint() {
    var fromAttr = scriptBootAttr("data-search-endpoint");
    if (fromAttr) return fromAttr;
    if (!BOOT_SCRIPT) return "";
    var src = BOOT_SCRIPT.getAttribute("src") || "";
    try {
      return new URL(src, location.href).origin + "/search";
    } catch (e) {
      return "";
    }
  }

  function qs(root, sel) {
    return root.querySelector(sel);
  }

  function qsa(root, sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  function first(root, selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el = qs(root, selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function all(root, selectors) {
    var seen = [];
    selectors.forEach(function (sel) {
      qsa(root, sel).forEach(function (el) {
        if (seen.indexOf(el) === -1) seen.push(el);
      });
    });
    return seen;
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.hidden = hidden;
    el.setAttribute("aria-hidden", hidden ? "true" : "false");
    if (hidden) {
      el.style.setProperty("display", "none", "important");
    } else {
      el.style.removeProperty("display");
    }
  }

  function setVisible(el, visible, fallbackText) {
    if (!el) return;
    el.hidden = !visible;
    el.setAttribute("aria-hidden", visible ? "false" : "true");
    if (visible) {
      el.style.setProperty("display", "block", "important");
      if (fallbackText && !el.textContent.trim()) {
        el.textContent = fallbackText;
      }
    } else {
      el.style.setProperty("display", "none", "important");
    }
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  function fillText(node, selectors, value) {
    selectors.forEach(function (sel) {
      qsa(node, sel).forEach(function (el) {
        el.textContent = value || "";
      });
    });
  }

  function fillImage(node, selectors, url) {
    selectors.forEach(function (sel) {
      qsa(node, sel).forEach(function (el) {
        if (!url) {
          if (el.tagName === "IMG") {
            el.removeAttribute("src");
            el.setAttribute("hidden", "true");
            el.style.display = "none";
          } else {
            el.style.display = "none";
          }
          return;
        }
        el.removeAttribute("hidden");
        el.style.removeProperty("display");
        if (el.tagName === "IMG") {
          el.setAttribute("src", url);
          el.removeAttribute("srcset");
          el.removeAttribute("sizes");
        } else {
          el.style.backgroundImage = "url(\"" + url + "\")";
        }
      });
    });
  }

  function setLink(node, url) {
    if (!url) return;
    if (node.tagName === "A") {
      node.setAttribute("href", url);
    }
    qsa(node, "a").forEach(function (a) {
      a.setAttribute("href", url);
    });
    qsa(node, "[data-search-result-url], [fs-cmssearch-field=\"url\"]").forEach(
      function (el) {
        if (el.tagName === "A") el.setAttribute("href", url);
      }
    );
  }

  function hideWebflowEmpty(listRoot) {
    qsa(listRoot, ".w-dyn-empty").forEach(function (el) {
      setHidden(el, true);
    });
  }

  function randomId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function storedId(storage, key) {
    try {
      var existing = storage.getItem(key);
      if (existing) return existing;
      var id = randomId();
      storage.setItem(key, id);
      return id;
    } catch (e) {
      return randomId();
    }
  }

  function deriveSuggestEndpoint(searchEndpoint, root) {
    var custom =
      root.getAttribute("data-search-suggest-endpoint") ||
      root.getAttribute("fs-cmssearch-suggest-endpoint");
    if (custom) return custom;
    try {
      var u = new URL(searchEndpoint, window.location.origin);
      if (/\/search\/?$/.test(u.pathname)) {
        u.pathname = u.pathname.replace(/\/search\/?$/, "/suggest");
      } else {
        u.pathname = u.pathname.replace(/\/?$/, "") + "/suggest";
      }
      return u.toString();
    } catch (e) {
      return String(searchEndpoint).replace(/\/search\/?$/, "/suggest");
    }
  }

  function placeSuggestPanel(panel, input, root) {
    if (!panel || !input || !root) return;
    var rs = window.getComputedStyle(root);
    if (rs.position === "static") root.style.position = "relative";

    var rootRect = root.getBoundingClientRect();
    var inputRect = input.getBoundingClientRect();
    var left = inputRect.left - rootRect.left + root.scrollLeft;
    var top = inputRect.bottom - rootRect.top + root.scrollTop + 4;
    var width = Math.max(inputRect.width, 160);

    panel.style.position = "absolute";
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.width = width + "px";
    panel.style.right = "auto";
    panel.style.marginTop = "0";
    panel.style.zIndex = "50";
    panel.style.boxSizing = "border-box";
  }

  function ensureSuggestPanel(root, input) {
    var panel = first(root, [
      "[data-search-suggest]",
      '[fs-cmssearch-element="suggest"]',
    ]);
    if (!panel) {
      var rs = window.getComputedStyle(root);
      if (rs.position === "static") root.style.position = "relative";

      panel = document.createElement("div");
      panel.setAttribute("data-search-suggest", "true");
      panel.setAttribute("role", "listbox");
      panel.setAttribute("hidden", "true");
      panel.style.cssText =
        "position:absolute;z-index:50;" +
        "background:#fff;border:1px solid #ddd;border-radius:8px;" +
        "box-shadow:0 8px 24px rgba(0,0,0,0.08);max-height:320px;overflow:auto;" +
        "display:none;text-align:left;box-sizing:border-box;";
      root.appendChild(panel);
    }
    placeSuggestPanel(panel, input, root);
    return panel;
  }

  function initRoot(root) {
    var fromScript = {
      endpoint: scriptDefaultEndpoint(),
      siteId: scriptBootAttr("data-search-site"),
      searchToken: scriptBootAttr("data-search-token"),
    };
    var endpoint =
      fromScript.endpoint ||
      root.getAttribute("data-search-endpoint") ||
      root.getAttribute("fs-cmssearch-endpoint");
    var siteId =
      fromScript.siteId ||
      root.getAttribute("data-search-site") ||
      root.getAttribute("fs-cmssearch-site");
    var searchToken =
      fromScript.searchToken ||
      root.getAttribute("data-search-token") ||
      root.getAttribute("fs-cmssearch-token");
    if (!endpoint) {
      console.warn("[cms-search] Add data-search-endpoint on the wrapper (your /search URL).");
      return;
    }
    if (!siteId || !searchToken) {
      console.warn(
        "[cms-search] Missing data-search-site / data-search-token. Install the search script from Talaash Setup (Custom Code API)."
      );
      return;
    }
    var rootSite = root.getAttribute("data-search-site");
    if (
      fromScript.siteId &&
      rootSite &&
      rootSite !== fromScript.siteId
    ) {
      console.warn(
        "[cms-search] Root data-search-site does not match the installed script. Using script credentials from Talaash Setup."
      );
    }

    var suggestEndpoint = deriveSuggestEndpoint(endpoint, root);
    var analyticsOff =
      scriptBootAttr("data-search-analytics") === "off" ||
      root.getAttribute("data-search-analytics") === "off";
    var suggestOff =
      root.getAttribute("data-search-suggest") === "off" ||
      scriptBootAttr("data-search-suggest") === "off";
    var visitorId = analyticsOff
      ? ""
      : storedId(localStorage, "cms-search-visitor");
    var sessionId = analyticsOff
      ? ""
      : storedId(sessionStorage, "cms-search-session");

    var input = first(root, [
      "[data-search-input]",
      '[fs-cmssearch-element="input"]',
    ]);
    var resultsEl = first(root, [
      "[data-search-results]",
      '[fs-cmssearch-element="list"]',
    ]);
    if (!input || !resultsEl) {
      console.warn("[cms-search] Need a search input and a results list inside the wrapper.");
      return;
    }

    var templateEl = null;
    var listMount = resultsEl;
    var tplTag = first(root, [
      "template[data-search-result]",
      "template[data-search-result-template]",
    ]);
    if (tplTag && tplTag.content) {
      var fromTpl =
        tplTag.content.querySelector("[data-search-result]") ||
        tplTag.content.firstElementChild;
      if (fromTpl) templateEl = fromTpl.cloneNode(true);
    }
    if (!templateEl) {
      var source = first(root, ["[data-search-result-source]"]);
      if (source) {
        var fromSource = first(source, [
          "[data-search-result]",
          '[fs-cmssearch-element="item"]',
        ]);
        if (fromSource) templateEl = fromSource.cloneNode(true);
        source.setAttribute("hidden", "true");
        source.style.display = "none";
      }
    }
    if (!templateEl) {
      var legacy = first(resultsEl, [
        "[data-search-result]",
        '[fs-cmssearch-element="item"]',
        ".w-dyn-item",
      ]);
      if (legacy) {
        templateEl = legacy.cloneNode(true);
        var dynItems = resultsEl.querySelector(".w-dyn-items");
        if (dynItems) listMount = dynItems;
        else listMount = legacy.parentNode || resultsEl;
        if (legacy.parentNode) legacy.parentNode.removeChild(legacy);
      }
    }
    if (!templateEl) {
      console.warn(
        "[cms-search] Add a hidden [data-search-result-source] block with your result card markup."
      );
      return;
    }

    templateEl.removeAttribute("hidden");
    templateEl.style.display = "";
    while (listMount.firstChild) {
      listMount.removeChild(listMount.firstChild);
    }
    hideWebflowEmpty(resultsEl);
    resultsEl.setAttribute("data-search-results-ready", "true");

    var template = templateEl;

    var filters = all(root, [
      "[data-search-filter]",
      "[fs-cmssearch-filter]",
    ]);
    var submitBtn = first(root, [
      "[data-search-submit]",
      '[fs-cmssearch-element="submit"]',
    ]);
    var answerEls = all(root, [
      "[data-search-answer]",
      '[fs-cmssearch-element="answer"]',
    ]);
    var suggestPanel = suggestOff ? null : ensureSuggestPanel(root, input);
    var mode = (
      root.getAttribute("data-search-mode") ||
      root.getAttribute("fs-cmssearch-mode") ||
      DEFAULT_MODE
    ).toLowerCase();
    var liveMode = mode === "live";
    var abortCtrl = null;
    var suggestAbort = null;
    var lastQuery = "";
    var activeSuggestIndex = -1;
    var suggestRows = [];
    var blurTimer = null;

    var LOADING_SELECTORS = [
      "[data-search-loading]",
      '[fs-cmssearch-element="loader"]',
    ];
    var EMPTY_SELECTORS = [
      "[data-search-empty]",
      '[fs-cmssearch-element="empty"]',
    ];

    function setAnswer(text) {
      answerEls.forEach(function (el) {
        if (text) {
          el.textContent = text;
          setVisible(el, true);
        } else {
          el.textContent = "";
          setVisible(el, false);
        }
      });
    }

    function showLoading(show) {
      var els = all(root, LOADING_SELECTORS);
      if (!show) {
        els.forEach(function (el) {
          setVisible(el, false);
        });
        root.classList.remove("is-search-loading");
        return;
      }
      var target =
        els.find(function (el) {
          return el.textContent.trim();
        }) || els[0];
      els.forEach(function (el) {
        setVisible(el, el === target, "Searching…");
      });
      root.classList.add("is-search-loading");
    }

    function showEmpty(show) {
      var els = all(root, EMPTY_SELECTORS);
      if (!show) {
        els.forEach(function (el) {
          setVisible(el, false);
        });
        return;
      }
      var target =
        els.find(function (el) {
          return el.textContent.trim();
        }) || els[0];
      els.forEach(function (el) {
        setVisible(el, el === target, "No results found.");
      });
    }

    function hideSuggest() {
      activeSuggestIndex = -1;
      suggestRows = [];
      if (!suggestPanel) return;
      while (suggestPanel.firstChild) {
        suggestPanel.removeChild(suggestPanel.firstChild);
      }
      setHidden(suggestPanel, true);
      suggestPanel.style.setProperty("display", "none", "important");
      input.setAttribute("aria-expanded", "false");
    }

    function setActiveSuggest(index) {
      activeSuggestIndex = index;
      suggestRows.forEach(function (row, i) {
        var on = i === index;
        row.setAttribute("aria-selected", on ? "true" : "false");
        row.style.background = on ? "#f3f4f6" : "transparent";
      });
    }

    function activateSuggestRow(row) {
      if (!row) return;
      var kind = row.getAttribute("data-suggest-kind");
      if (kind === "query") {
        var text = row.getAttribute("data-suggest-text") || "";
        input.value = text;
        hideSuggest();
        lastQuery = text;
        search(text);
      } else if (kind === "item") {
        var url = row.getAttribute("data-suggest-url") || "";
        hideSuggest();
        if (url) window.location.href = url;
      }
    }

    function renderSuggest(data) {
      while (suggestPanel.firstChild) {
        suggestPanel.removeChild(suggestPanel.firstChild);
      }
      suggestRows = [];
      activeSuggestIndex = -1;

      var suggestions = (data && data.suggestions) || [];
      var items = (data && data.items) || [];
      if (!suggestions.length && !items.length) {
        hideSuggest();
        return;
      }

      function addHeading(label) {
        var h = document.createElement("div");
        h.textContent = label;
        h.style.cssText =
          "padding:8px 12px 4px;font-size:11px;font-weight:600;" +
          "letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;";
        suggestPanel.appendChild(h);
      }

      function addRow(opts) {
        var row = document.createElement("div");
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", "false");
        row.setAttribute("data-suggest-kind", opts.kind);
        if (opts.text) row.setAttribute("data-suggest-text", opts.text);
        if (opts.url) row.setAttribute("data-suggest-url", opts.url);
        row.style.cssText =
          "padding:10px 12px;cursor:pointer;font-size:14px;line-height:1.35;color:#111;";
        if (opts.meta) {
          var title = document.createElement("div");
          title.textContent = opts.label;
          var meta = document.createElement("div");
          meta.textContent = opts.meta;
          meta.style.cssText = "font-size:12px;color:#6b7280;margin-top:2px;";
          row.appendChild(title);
          row.appendChild(meta);
        } else {
          row.textContent = opts.label;
        }
        row.addEventListener("mousedown", function (e) {
          e.preventDefault();
          activateSuggestRow(row);
        });
        row.addEventListener("mouseenter", function () {
          setActiveSuggest(suggestRows.indexOf(row));
        });
        suggestPanel.appendChild(row);
        suggestRows.push(row);
      }

      if (suggestions.length) {
        addHeading("Suggestions");
        suggestions.forEach(function (s) {
          addRow({
            kind: "query",
            text: s.text,
            label: s.text,
          });
        });
      }
      if (items.length) {
        addHeading("Content");
        items.forEach(function (item) {
          addRow({
            kind: "item",
            url: item.url,
            label: item.title,
            meta: item.type || "",
          });
        });
      }

      setHidden(suggestPanel, false);
      suggestPanel.style.setProperty("display", "block", "important");
      placeSuggestPanel(suggestPanel, input, root);
      input.setAttribute("aria-expanded", "true");
    }

    function fetchSuggest(q) {
      if (suggestAbort) suggestAbort.abort();
      if (!q || q.length < SUGGEST_MIN_CHARS) {
        hideSuggest();
        return;
      }
      suggestAbort = new AbortController();
      var url = new URL(suggestEndpoint, window.location.origin);
      url.searchParams.set("q", q);
      url.searchParams.set("site", siteId);
      url.searchParams.set("token", searchToken);
      url.searchParams.set("limit", "6");

      fetch(url.toString(), { signal: suggestAbort.signal })
        .then(function (res) {
          if (!res.ok) throw new Error("suggest " + res.status);
          return res.json();
        })
        .then(function (data) {
          if ((input.value || "").trim() !== q) return;
          renderSuggest(data);
        })
        .catch(function (err) {
          if (err && err.name === "AbortError") return;
          hideSuggest();
        });
    }

    var debouncedSuggest = debounce(function () {
      fetchSuggest((input.value || "").trim());
    }, SUGGEST_DEBOUNCE_MS);

    showLoading(false);
    showEmpty(false);
    setAnswer("");
    hideSuggest();
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("autocomplete", "off");

    function activeTypes() {
      return filters
        .filter(function (btn) {
          return (
            btn.getAttribute("aria-pressed") === "true" ||
            btn.classList.contains("is-active")
          );
        })
        .map(function (btn) {
          return (
            btn.getAttribute("data-search-filter") ||
            btn.getAttribute("fs-cmssearch-filter")
          );
        })
        .filter(Boolean);
    }

    function render(items) {
      while (listMount.firstChild) {
        listMount.removeChild(listMount.firstChild);
      }
      items.forEach(function (item) {
        var node = template.cloneNode(true);
        node.classList.remove("w-dyn-item");
        node.style.display = "";
        node.removeAttribute("hidden");
        setLink(node, item.url);
        fillText(
          node,
          [
            "[data-search-result-type]",
            '[fs-cmssearch-field="type"]',
          ],
          item.type
        );
        fillText(
          node,
          [
            "[data-search-result-title]",
            '[fs-cmssearch-field="title"]',
          ],
          item.title
        );
        fillText(
          node,
          [
            "[data-search-result-snippet]",
            '[fs-cmssearch-field="snippet"]',
          ],
          item.snippet || item.excerpt || ""
        );
        fillImage(
          node,
          [
            "[data-search-result-image]",
            '[fs-cmssearch-field="image"]',
          ],
          item.image_url
        );
        listMount.appendChild(node);
      });
    }

    function search(queryOverride) {
      var q =
        queryOverride !== undefined
          ? String(queryOverride).trim()
          : (input.value || "").trim();
      hideSuggest();
      if (!q) {
        if (abortCtrl) abortCtrl.abort();
        showLoading(false);
        showEmpty(false);
        setAnswer("");
        while (listMount.firstChild) {
          listMount.removeChild(listMount.firstChild);
        }
        return;
      }

      if (abortCtrl) abortCtrl.abort();
      abortCtrl = new AbortController();

      while (listMount.firstChild) {
        listMount.removeChild(listMount.firstChild);
      }
      showEmpty(false);
      setAnswer("");
      showLoading(true);

      var url = new URL(endpoint, window.location.origin);
      url.searchParams.set("q", q);
      url.searchParams.set("limit", "20");
      url.searchParams.set("site", siteId);
      url.searchParams.set("token", searchToken);
      if (visitorId) url.searchParams.set("visitor", visitorId);
      if (sessionId) url.searchParams.set("session", sessionId);
      var types = activeTypes();
      if (types.length) url.searchParams.set("types", types.join(","));

      fetch(url.toString(), { signal: abortCtrl.signal })
        .then(function (res) {
          if (!res.ok) throw new Error("search " + res.status);
          return res.json();
        })
        .then(function (data) {
          showLoading(false);
          var items = (data && data.results) || [];
          setAnswer((data && data.answer) || "");
          render(items);
          showEmpty(items.length === 0);
        })
        .catch(function (err) {
          if (err && err.name === "AbortError") return;
          showLoading(false);
          setAnswer("");
          while (listMount.firstChild) {
            listMount.removeChild(listMount.firstChild);
          }
          showEmpty(true);
        });
    }

    function submitSearch() {
      var q = (input.value || "").trim();
      if (!q) return;
      lastQuery = q;
      search(q);
    }

    function clearResults() {
      lastQuery = "";
      hideSuggest();
      search("");
    }

    if (!suggestOff) {
      input.addEventListener("input", debouncedSuggest);
    }

    input.addEventListener("keydown", function (e) {
      var open =
        !suggestOff &&
        suggestPanel &&
        suggestRows.length > 0 &&
        !suggestPanel.hidden;
      if (e.key === "ArrowDown" && open) {
        e.preventDefault();
        setActiveSuggest(
          activeSuggestIndex < suggestRows.length - 1
            ? activeSuggestIndex + 1
            : 0
        );
        return;
      }
      if (e.key === "ArrowUp" && open) {
        e.preventDefault();
        setActiveSuggest(
          activeSuggestIndex > 0
            ? activeSuggestIndex - 1
            : suggestRows.length - 1
        );
        return;
      }
      if (e.key === "Escape") {
        hideSuggest();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        if (open && activeSuggestIndex >= 0) {
          e.preventDefault();
          activateSuggestRow(suggestRows[activeSuggestIndex]);
          return;
        }
        e.preventDefault();
        submitSearch();
      }
    });

    input.addEventListener("blur", function () {
      if (suggestOff) return;
      blurTimer = setTimeout(hideSuggest, 150);
    });
    input.addEventListener("focus", function () {
      if (suggestOff) return;
      if (blurTimer) clearTimeout(blurTimer);
      var q = (input.value || "").trim();
      if (q.length >= SUGGEST_MIN_CHARS) debouncedSuggest();
    });

    function onViewportChange() {
      if (suggestOff || !suggestPanel || suggestPanel.hidden) return;
      placeSuggestPanel(suggestPanel, input, root);
    }
    if (!suggestOff) {
      window.addEventListener("resize", onViewportChange);
      window.addEventListener("scroll", onViewportChange, true);
    }

    input.setAttribute("enterkeyhint", "search");
    input.addEventListener("search", function () {
      if (!(input.value || "").trim()) clearResults();
    });

    // live mode: suggest on type; full search still on Enter/submit only
    if (liveMode) {
      /* suggest already on input; no per-keystroke /search */
    }

    var form = input.form || input.closest("form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitSearch();
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", function (e) {
        e.preventDefault();
        submitSearch();
      });
    }

    filters.forEach(function (btn) {
      if (!btn.hasAttribute("aria-pressed")) {
        btn.setAttribute("aria-pressed", "false");
      }
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var next = btn.getAttribute("aria-pressed") !== "true";
        btn.setAttribute("aria-pressed", next ? "true" : "false");
        btn.classList.toggle("is-active", next);
        if (lastQuery) search(lastQuery);
      });
    });
  }

  function ensureDefaultStyles() {
    if (document.getElementById("talaash-search-css")) return;
    var style = document.createElement("style");
    style.id = "talaash-search-css";
    style.textContent = "/* Talaash search widget defaults — source of truth for styles inlined into public/search.js.\r\n * Do not rely on a separate <link> to this file for production installs (SRI applies to search.js only).\r\n * After editing, run: node scripts/inline-search-css.mjs\r\n */\r\n\r\n[data-search] {\r\n  --talaash-ink: #181d26;\r\n  --talaash-muted: #41454d;\r\n  --talaash-border: #dddddd;\r\n  --talaash-soft: #f8fafc;\r\n  --talaash-accent: #181d26;\r\n  --talaash-link: #1b61c9;\r\n  --talaash-radius: 10px;\r\n  --talaash-font: \"Inter\", system-ui, -apple-system, \"Segoe UI\", sans-serif;\r\n\r\n  box-sizing: border-box;\r\n  font-family: var(--talaash-font);\r\n  color: var(--talaash-ink);\r\n  max-width: 820px;\r\n  width: 100%;\r\n}\r\n\r\n[data-search] *,\r\n[data-search] *::before,\r\n[data-search] *::after {\r\n  box-sizing: border-box;\r\n}\r\n\r\n[data-search] [data-search-input] {\r\n  display: block;\r\n  width: 100%;\r\n  margin: 0;\r\n  padding: 14px 16px;\r\n  font: inherit;\r\n  font-size: 16px;\r\n  line-height: 1.4;\r\n  color: var(--talaash-ink);\r\n  background: #fff;\r\n  border: 1px solid var(--talaash-border);\r\n  border-radius: var(--talaash-radius);\r\n  outline: none;\r\n  transition: border-color 0.15s ease, box-shadow 0.15s ease;\r\n}\r\n\r\n[data-search] [data-search-input]::placeholder {\r\n  color: #9297a0;\r\n}\r\n\r\n[data-search] [data-search-input]:focus {\r\n  border-color: var(--talaash-ink);\r\n  box-shadow: 0 0 0 3px rgba(24, 29, 38, 0.12);\r\n}\r\n\r\n[data-search] [data-search-filters],\r\n[data-search] .talaash-filters {\r\n  display: flex;\r\n  flex-wrap: wrap;\r\n  gap: 8px;\r\n  margin-top: 12px;\r\n}\r\n\r\n[data-search] [data-search-filter] {\r\n  display: inline-flex;\r\n  align-items: center;\r\n  padding: 8px 12px;\r\n  font-size: 13px;\r\n  font-weight: 600;\r\n  line-height: 1;\r\n  color: var(--talaash-muted);\r\n  text-decoration: none;\r\n  background: var(--talaash-soft);\r\n  border: 1px solid var(--talaash-border);\r\n  border-radius: 999px;\r\n  cursor: pointer;\r\n}\r\n\r\n[data-search] [data-search-filter]:hover,\r\n[data-search] [data-search-filter].is-active,\r\n[data-search] [data-search-filter][aria-pressed=\"true\"] {\r\n  color: #fff;\r\n  background: var(--talaash-accent);\r\n  border-color: var(--talaash-accent);\r\n}\r\n\r\n[data-search] [data-search-answer] {\r\n  margin: 16px 0 8px;\r\n  padding: 14px 16px;\r\n  font-size: 15px;\r\n  line-height: 1.55;\r\n  color: var(--talaash-ink);\r\n  background: var(--talaash-soft);\r\n  border: 1px solid var(--talaash-border);\r\n  border-radius: var(--talaash-radius);\r\n}\r\n\r\n[data-search] [data-search-loading],\r\n[data-search] [data-search-empty] {\r\n  margin-top: 20px;\r\n  font-size: 14px;\r\n  color: var(--talaash-muted);\r\n}\r\n\r\n[data-search] [data-search-result-source] {\r\n  display: none !important;\r\n}\r\n\r\n[data-search] [data-search-results]:empty {\r\n  display: none;\r\n}\r\n\r\n[data-search] [data-search-results] {\r\n  display: grid;\r\n  gap: 12px;\r\n  margin-top: 20px;\r\n}\r\n\r\n[data-search] a[data-search-result] {\r\n  display: grid;\r\n  grid-template-columns: 88px 1fr;\r\n  gap: 14px;\r\n  align-items: start;\r\n  padding: 14px;\r\n  text-decoration: none;\r\n  color: inherit;\r\n  background: #fff;\r\n  border: 1px solid var(--talaash-border);\r\n  border-radius: var(--talaash-radius);\r\n  transition: border-color 0.15s ease, box-shadow 0.15s ease;\r\n}\r\n\r\n[data-search] a[data-search-result]:not(:has([data-search-result-image]:not([hidden]))) {\r\n  grid-template-columns: 1fr;\r\n}\r\n\r\n[data-search] a[data-search-result]:hover {\r\n  border-color: #9297a0;\r\n  box-shadow: 0 8px 24px rgba(24, 29, 38, 0.06);\r\n}\r\n\r\n[data-search] [data-search-result-image] {\r\n  width: 88px;\r\n  height: 88px;\r\n  object-fit: cover;\r\n  border-radius: 8px;\r\n  background: var(--talaash-soft);\r\n}\r\n\r\n[data-search] [data-search-result-image][hidden] {\r\n  display: none !important;\r\n}\r\n\r\n[data-search] [data-search-result-body] {\r\n  min-width: 0;\r\n}\r\n\r\n[data-search] [data-search-result-type] {\r\n  margin: 0 0 4px;\r\n  font-size: 11px;\r\n  font-weight: 600;\r\n  letter-spacing: 0.06em;\r\n  text-transform: uppercase;\r\n  color: var(--talaash-muted);\r\n}\r\n\r\n[data-search] [data-search-result-title] {\r\n  margin: 0 0 6px;\r\n  font-size: 17px;\r\n  font-weight: 600;\r\n  line-height: 1.3;\r\n  color: var(--talaash-ink);\r\n}\r\n\r\n[data-search] [data-search-result-snippet] {\r\n  margin: 0;\r\n  font-size: 14px;\r\n  line-height: 1.5;\r\n  color: var(--talaash-muted);\r\n}\r\n\r\n[data-search] [data-search-suggest] {\r\n  font-family: var(--talaash-font);\r\n  /* Position/size are set in search.js to match the input box */\r\n  right: auto;\r\n  margin-top: 0;\r\n}\r\n\r\n[data-search] [data-search-suggest] [role=\"option\"],\r\n[data-search] [data-search-suggest] button {\r\n  font: inherit;\r\n}\r\n\r\n@media (max-width: 560px) {\r\n  [data-search] a[data-search-result] {\r\n    grid-template-columns: 64px 1fr;\r\n    gap: 12px;\r\n    padding: 12px;\r\n  }\r\n\r\n  [data-search] [data-search-result-image] {\r\n    width: 64px;\r\n    height: 64px;\r\n  }\r\n}\r\n\r\n/* Opt out: add data-search-unstyled on the root wrapper */\r\n[data-search][data-search-unstyled],\r\n[data-search][data-search-unstyled] * {\r\n  all: revert;\r\n}\r\n";
    document.head.appendChild(style);
  }

  function boot() {
    ensureDefaultStyles();
    all(document, ['[data-search]', '[fs-cmssearch-element="root"]']).forEach(
      initRoot
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
