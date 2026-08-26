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
 * Input:    data-search-input
 * List:     data-search-results   (put this on the Collection List)
 * Item:     data-search-result    (put this on the Collection Item — template)
 * Fields:   data-search-result-title | -type | -snippet | -image
 * States:   data-search-loading | data-search-empty
 * Filters:  data-search-filter="blog"
 * Mode:     data-search-mode="submit" (default, Enter to search) | "live" (typeahead)
 * Submit:   data-search-submit  (optional button; form submit also works)
 */
(function () {
  "use strict";

  var DEBOUNCE_MS = 250;
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

  function initRoot(root) {
    var endpoint =
      root.getAttribute("data-search-endpoint") ||
      root.getAttribute("fs-cmssearch-endpoint");
    var siteId =
      root.getAttribute("data-search-site") ||
      root.getAttribute("fs-cmssearch-site");
    if (!endpoint) {
      console.warn("[cms-search] Add data-search-endpoint on the wrapper (your Vercel /search URL).");
      return;
    }

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
    var mode = (
      root.getAttribute("data-search-mode") ||
      root.getAttribute("fs-cmssearch-mode") ||
      DEFAULT_MODE
    ).toLowerCase();
    var liveMode = mode === "live";
    var abortCtrl = null;
    var lastQuery = "";

    var LOADING_SELECTORS = [
      "[data-search-loading]",
      '[fs-cmssearch-element="loader"]',
    ];
    var EMPTY_SELECTORS = [
      "[data-search-empty]",
      '[fs-cmssearch-element="empty"]',
    ];

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

    showLoading(false);
    showEmpty(false);

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
      if (!q) {
        if (abortCtrl) abortCtrl.abort();
        showLoading(false);
        showEmpty(false);
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
      showLoading(true);

      var url = new URL(endpoint, window.location.origin);
      url.searchParams.set("q", q);
      url.searchParams.set("limit", "20");
      if (siteId) url.searchParams.set("site", siteId);
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
          render(items);
          showEmpty(items.length === 0);
        })
        .catch(function (err) {
          if (err && err.name === "AbortError") return;
          showLoading(false);
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
      search("");
    }

    if (liveMode) {
      var debounced = debounce(search, DEBOUNCE_MS);
      input.addEventListener("input", debounced);
      input.addEventListener("search", search);
    } else {
      input.setAttribute("enterkeyhint", "search");
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submitSearch();
        }
      });
      input.addEventListener("search", function () {
        if (!(input.value || "").trim()) clearResults();
      });
    }

    var form = input.form || input.closest("form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (liveMode) search();
        else submitSearch();
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
