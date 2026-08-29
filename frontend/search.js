/**
 * Webflow CMS semantic search — Finsweet-style attributes, no build step.
 *
 * Site Settings → Custom Code → Footer:
 *   <script src="https://YOUR_VERCEL_APP/search.js"></script>
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
    if (!url) return;
    selectors.forEach(function (sel) {
      qsa(node, sel).forEach(function (el) {
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

  function ensureSuggestPanel(root, input) {
    var panel = first(root, [
      "[data-search-suggest]",
      '[fs-cmssearch-element="suggest"]',
    ]);
    if (panel) return panel;

    var wrap = input.parentNode;
    if (wrap && wrap !== root) {
      var style = window.getComputedStyle(wrap);
      if (style.position === "static") wrap.style.position = "relative";
    } else if (root) {
      var rs = window.getComputedStyle(root);
      if (rs.position === "static") root.style.position = "relative";
    }

    panel = document.createElement("div");
    panel.setAttribute("data-search-suggest", "true");
    panel.setAttribute("role", "listbox");
    panel.setAttribute("hidden", "true");
    panel.style.cssText =
      "position:absolute;left:0;right:0;top:100%;z-index:50;margin-top:4px;" +
      "background:#fff;border:1px solid #ddd;border-radius:8px;" +
      "box-shadow:0 8px 24px rgba(0,0,0,0.08);max-height:320px;overflow:auto;" +
      "display:none;text-align:left;";
    (wrap && wrap !== root ? wrap : root).appendChild(panel);
    return panel;
  }

  function initRoot(root) {
    var endpoint =
      root.getAttribute("data-search-endpoint") ||
      root.getAttribute("fs-cmssearch-endpoint");
    var siteId =
      root.getAttribute("data-search-site") ||
      root.getAttribute("fs-cmssearch-site");
    var searchToken =
      root.getAttribute("data-search-token") ||
      root.getAttribute("fs-cmssearch-token");
    if (!endpoint) {
      console.warn("[cms-search] Add data-search-endpoint on the wrapper (your Vercel /search URL).");
      return;
    }
    if (!siteId || !searchToken) {
      console.warn(
        "[cms-search] Add data-search-site and data-search-token from /app so results stay scoped to your site."
      );
      return;
    }

    var suggestEndpoint = deriveSuggestEndpoint(endpoint, root);

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

    var template = first(resultsEl, [
      "[data-search-result]",
      '[fs-cmssearch-element="item"]',
      ".w-dyn-item",
    ]);
    if (!template) {
      console.warn("[cms-search] Put data-search-result on your Collection Item (the card you designed).");
      return;
    }

    var listMount = template.parentNode;
    var dynItems = resultsEl.querySelector(".w-dyn-items");
    if (dynItems) listMount = dynItems;

    template.parentNode.removeChild(template);
    while (listMount.firstChild) {
      listMount.removeChild(listMount.firstChild);
    }
    hideWebflowEmpty(resultsEl);

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
    var suggestPanel = ensureSuggestPanel(root, input);
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

    input.addEventListener("input", debouncedSuggest);

    input.addEventListener("keydown", function (e) {
      var open = suggestRows.length > 0 && !suggestPanel.hidden;
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
      blurTimer = setTimeout(hideSuggest, 150);
    });
    input.addEventListener("focus", function () {
      if (blurTimer) clearTimeout(blurTimer);
      var q = (input.value || "").trim();
      if (q.length >= SUGGEST_MIN_CHARS) debouncedSuggest();
    });

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

  function boot() {
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
