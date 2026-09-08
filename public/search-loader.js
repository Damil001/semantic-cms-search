/**
 * Stable Talaash widget loader — register THIS once via Custom Code.
 * It fetches /api/widget/manifest and injects the current search.js + SRI.
 * Updating search.js no longer requires reinstalling Custom Code.
 */
(function () {
  "use strict";
  var boot = document.currentScript;
  if (!boot || !boot.src) {
    console.error("[talaash] loader missing script src");
    return;
  }

  var origin;
  try {
    origin = new URL(boot.src).origin;
  } catch (e) {
    console.error("[talaash] invalid loader src");
    return;
  }

  var ATTRS = [
    "data-search-site",
    "data-search-token",
    "data-search-endpoint",
  ];

  fetch(origin + "/api/widget/manifest", { credentials: "omit", cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("manifest " + res.status);
      return res.json();
    })
    .then(function (manifest) {
      if (!manifest || !manifest.src || !manifest.integrity) {
        throw new Error("invalid manifest");
      }
      var s = document.createElement("script");
      s.src = manifest.src;
      s.integrity = manifest.integrity;
      s.crossOrigin = "anonymous";
      s.async = false;
      ATTRS.forEach(function (name) {
        var value = boot.getAttribute(name);
        if (value) s.setAttribute(name, value);
      });
      (document.head || document.documentElement).appendChild(s);
    })
    .catch(function (err) {
      console.error("[talaash] failed to load search widget", err);
    });
})();
