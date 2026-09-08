import { createHash } from "node:crypto";

const API = "https://api.webflow.com/v2";

/** Immutable display name for registered hosted search.js (alphanumeric, ≤50). */
export const TALAASH_SCRIPT_DISPLAY_NAME = "TalaashSearch";

/** Bump when public/search.js behavior changes (Webflow script versions are immutable). */
export const TALAASH_SCRIPT_VERSION =
  process.env.SEARCH_SCRIPT_VERSION?.trim() || "1.0.2";

type AppliedScript = {
  id: string;
  location: "header" | "footer";
  version: string;
  attributes?: Record<string, string>;
};

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
  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }
  return {
    ok: true,
    data: (body ? JSON.parse(body) : {}) as T,
  };
}

async function sriSha256(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch search script for integrity hash (${res.status})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const digest = createHash("sha256").update(buf).digest("base64");
  return `sha256-${digest}`;
}

async function listRegisteredScripts(
  token: string,
  siteId: string
): Promise<{ id: string; version?: string; displayName?: string }[]> {
  const result = await wfJson<{ scripts?: { id: string; version?: string; displayName?: string }[] }>(
    token,
    `/sites/${siteId}/registered_scripts`
  );
  if (!result.ok) {
    throw new Error(`List scripts failed (${result.status}): ${result.body}`);
  }
  return result.data.scripts ?? [];
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

  // Already registered (same displayName + version) — resolve from list
  const existing = (await listRegisteredScripts(token, siteId)).find(
    (s) =>
      (s.displayName === opts.displayName || s.id === opts.displayName) &&
      (!s.version || s.version === opts.version)
  );
  if (existing) {
    return { id: existing.id, version: existing.version ?? opts.version };
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
 * Register hosted search.js and apply it site-wide in the footer via Custom Code API.
 * Does not publish — customer must publish in Webflow for changes to go live.
 */
export async function installSearchScript(opts: {
  accessToken: string;
  siteId: string;
  scriptUrl: string;
  searchEndpoint: string;
  searchToken: string;
}): Promise<{ scriptId: string; version: string }> {
  const integrityHash = await sriSha256(opts.scriptUrl);
  const registered = await registerHostedScript(opts.accessToken, opts.siteId, {
    hostedLocation: opts.scriptUrl,
    integrityHash,
    version: TALAASH_SCRIPT_VERSION,
    displayName: TALAASH_SCRIPT_DISPLAY_NAME,
  });

  const existing = await getSiteCustomCode(opts.accessToken, opts.siteId);
  const ours = new Set(
    (await listRegisteredScripts(opts.accessToken, opts.siteId))
      .filter(
        (s) =>
          s.displayName === TALAASH_SCRIPT_DISPLAY_NAME ||
          s.id === registered.id ||
          s.id.startsWith("talaash")
      )
      .map((s) => s.id)
  );
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
  return { scriptId: registered.id, version: registered.version };
}

/** Remove Talaash applied scripts from site-level custom code (before token revoke). */
export async function uninstallSearchScript(opts: {
  accessToken: string;
  siteId: string;
}): Promise<void> {
  const registered = await listRegisteredScripts(opts.accessToken, opts.siteId);
  const ours = new Set(
    registered
      .filter(
        (s) =>
          s.displayName === TALAASH_SCRIPT_DISPLAY_NAME ||
          s.id.toLowerCase().includes("talaash")
      )
      .map((s) => s.id)
  );

  if (ours.size === 0) return;

  const existing = await getSiteCustomCode(opts.accessToken, opts.siteId);
  const kept = existing.filter((s) => !ours.has(s.id));
  await putSiteCustomCode(opts.accessToken, opts.siteId, kept);
}
