import { createHash } from "node:crypto";
import {
  clearInstallAccessTokenByToken,
  WebflowAuthRevokedError,
} from "./webflow-admin.js";

const API = "https://api.webflow.com/v2";

/** Registered Custom Code display name for the pinned search.js widget. */
export const TALAASH_SEARCH_DISPLAY_NAME = "TalaashSearch";
/** Legacy loader name — remove from site custom code on install/uninstall. */
export const TALAASH_LOADER_DISPLAY_NAME = "TalaashLoader";

type AppliedScript = {
  id: string;
  location: "header" | "footer";
  version: string;
  attributes?: Record<string, string>;
};

type RegisteredScript = {
  id: string;
  version?: string;
  displayName?: string;
  hostedLocation?: string;
  integrityHash?: string;
};

async function sriForUrl(url: string): Promise<{ integrityHash: string; version: string }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch script for integrity hash (${res.status}): ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const digest = createHash("sha256").update(buf).digest("base64");
  const integrityHash = `sha256-${digest}`;
  const patch = createHash("sha256").update(buf).digest("hex").slice(0, 8);
  const version =
    process.env.SEARCH_SCRIPT_VERSION?.trim() ||
    `1.0.${Number.parseInt(patch, 16) % 1_000_000_000}`;
  return { integrityHash, version };
}

async function wfJson<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; body: string }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  const body = await res.text();
  if (res.status === 401) {
    await clearInstallAccessTokenByToken(token);
    throw new WebflowAuthRevokedError(
      `Webflow authorization revoked (401 ${path}). Reconnect Webflow in Setup.`
    );
  }
  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }
  return {
    ok: true,
    data: (body ? JSON.parse(body) : {}) as T,
  };
}

/** Webflow returns `registeredScripts` (not `scripts`). */
async function listRegisteredScripts(
  token: string,
  siteId: string
): Promise<RegisteredScript[]> {
  const all: RegisteredScript[] = [];
  let offset = 0;
  const limit = 100;

  for (;;) {
    const result = await wfJson<{
      registeredScripts?: RegisteredScript[];
      scripts?: RegisteredScript[];
      pagination?: { total?: number; offset?: number; limit?: number };
    }>(token, `/sites/${siteId}/registered_scripts?limit=${limit}&offset=${offset}`);

    if (!result.ok) {
      throw new Error(`List scripts failed (${result.status}): ${result.body}`);
    }

    const page = result.data.registeredScripts ?? result.data.scripts ?? [];
    all.push(...page);

    const total = result.data.pagination?.total;
    offset += page.length;
    if (page.length < limit || (typeof total === "number" && offset >= total)) {
      break;
    }
    if (page.length === 0) break;
  }

  return all;
}

function isOurScript(s: { id: string; displayName?: string }): boolean {
  const name = (s.displayName || "").toLowerCase();
  const id = (s.id || "").toLowerCase();
  return (
    name === TALAASH_SEARCH_DISPLAY_NAME.toLowerCase() ||
    name === TALAASH_LOADER_DISPLAY_NAME.toLowerCase() ||
    id.includes("talaash")
  );
}

function scriptNameMatches(s: RegisteredScript, displayName: string): boolean {
  const want = displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = (s.displayName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const id = (s.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return name === want || id === want || id.includes("talaash");
}

async function findRegisteredScript(
  token: string,
  siteId: string,
  opts: { displayName: string; version: string }
): Promise<{ id: string; version: string } | null> {
  const list = await listRegisteredScripts(token, siteId);
  const wantVersion = opts.version.toLowerCase();
  const match =
    list.find(
      (s) =>
        scriptNameMatches(s, opts.displayName) &&
        (s.version || "").toLowerCase() === wantVersion
    ) || list.find((s) => scriptNameMatches(s, opts.displayName));
  if (!match?.id) return null;
  return { id: match.id, version: match.version ?? opts.version };
}

/** Derive Webflow script id from display name (e.g. TalaashSearch → talaashsearch). */
function scriptIdFromDisplayName(displayName: string): string {
  return displayName.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function registerHostedScript(
  token: string,
  siteId: string,
  opts: {
    hostedLocation: string;
    integrityHash: string;
    version: string;
    displayName: string;
  }
): Promise<{ id: string; version: string }> {
  // Reuse if Webflow already has this version (survives Talaash account delete).
  const preexisting = await findRegisteredScript(token, siteId, {
    displayName: opts.displayName,
    version: opts.version,
  });
  if (preexisting && preexisting.version === opts.version) {
    return preexisting;
  }

  const result = await wfJson<{ id?: string; version?: string }>(
    token,
    `/sites/${siteId}/registered_scripts/hosted`,
    {
      method: "POST",
      body: JSON.stringify({
        hostedLocation: opts.hostedLocation,
        integrityHash: opts.integrityHash,
        version: opts.version,
        displayName: opts.displayName,
        canCopy: false,
      }),
    }
  );

  if (result.ok && result.data.id) {
    return {
      id: result.data.id,
      version: result.data.version ?? opts.version,
    };
  }

  // Register returns 201; treat other 2xx with id the same.
  const duplicate =
    !result.ok &&
    (result.status === 400 || result.status === 409) &&
    /duplicate_registered_script|already exists/i.test(result.body);

  if (duplicate) {
    const existing = await findRegisteredScript(token, siteId, {
      displayName: opts.displayName,
      version: opts.version,
    });
    if (existing) return existing;

    // Last resort: error names the script id (talaashsearch) + version we sent.
    return {
      id: scriptIdFromDisplayName(opts.displayName),
      version: opts.version,
    };
  }

  throw new Error(
    `Register hosted script failed (${result.ok ? 200 : result.status}): ${
      result.ok ? "missing id" : result.body
    }`
  );
}

async function getSiteCustomCode(
  token: string,
  siteId: string
): Promise<AppliedScript[]> {
  const result = await wfJson<{ scripts?: AppliedScript[] }>(
    token,
    `/sites/${siteId}/custom_code`
  );
  if (!result.ok) {
    if (result.status === 404) return [];
    throw new Error(`Get site custom code failed (${result.status}): ${result.body}`);
  }
  return result.data.scripts ?? [];
}

async function putSiteCustomCode(
  token: string,
  siteId: string,
  scripts: AppliedScript[]
): Promise<void> {
  const result = await wfJson(token, `/sites/${siteId}/custom_code`, {
    method: "PUT",
    body: JSON.stringify({ scripts }),
  });
  if (!result.ok) {
    throw new Error(`Apply site custom code failed (${result.status}): ${result.body}`);
  }
}

/**
 * Register pinned search.js via Custom Code (hostedLocation + SRI).
 * Widget updates require Install again (new immutable script version) — no runtime loader.
 */
export async function installSearchScript(opts: {
  accessToken: string;
  siteId: string;
  /** Full URL to search.js, e.g. https://www.talaash.org/search.js */
  scriptUrl: string;
  searchEndpoint: string;
  searchToken: string;
}): Promise<{
  scriptId: string;
  version: string;
  integrityHash: string;
  hostedLocation: string;
}> {
  const baseUrl = opts.scriptUrl.replace(/[?#].*$/, "");
  const { integrityHash, version } = await sriForUrl(baseUrl);
  const hostedLocation = `${baseUrl}?v=${encodeURIComponent(version)}`;

  const registered = await registerHostedScript(opts.accessToken, opts.siteId, {
    hostedLocation,
    integrityHash,
    version,
    displayName: TALAASH_SEARCH_DISPLAY_NAME,
  });

  const existing = await getSiteCustomCode(opts.accessToken, opts.siteId);
  const registeredAll = await listRegisteredScripts(opts.accessToken, opts.siteId);
  const ours = new Set(registeredAll.filter(isOurScript).map((s) => s.id));
  ours.add(registered.id);

  const kept = existing.filter((s) => !ours.has(s.id));
  kept.push({
    id: registered.id,
    location: "footer",
    version: registered.version,
    attributes: {
      "data-search-site": opts.siteId,
      "data-search-token": opts.searchToken,
      "data-search-endpoint": opts.searchEndpoint,
    },
  });

  await putSiteCustomCode(opts.accessToken, opts.siteId, kept);
  return {
    scriptId: registered.id,
    version: registered.version,
    integrityHash,
    hostedLocation,
  };
}

/** Remove Talaash applied scripts from site-level custom code (before token revoke). */
export async function uninstallSearchScript(opts: {
  accessToken: string;
  siteId: string;
}): Promise<void> {
  const registered = await listRegisteredScripts(opts.accessToken, opts.siteId);
  const ours = new Set(registered.filter(isOurScript).map((s) => s.id));
  if (ours.size === 0) {
    // Still strip any applied rows that look like ours (id slug).
    const existing = await getSiteCustomCode(opts.accessToken, opts.siteId);
    const kept = existing.filter((s) => !String(s.id).toLowerCase().includes("talaash"));
    if (kept.length !== existing.length) {
      await putSiteCustomCode(opts.accessToken, opts.siteId, kept);
    }
    return;
  }

  const existing = await getSiteCustomCode(opts.accessToken, opts.siteId);
  const kept = existing.filter((s) => !ours.has(s.id));
  await putSiteCustomCode(opts.accessToken, opts.siteId, kept);
}
