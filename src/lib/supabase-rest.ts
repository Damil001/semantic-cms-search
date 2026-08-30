import { normalizeSupabaseUrl } from "./supabase-url.js";

export function supabaseRestConfig(): { url: string; key: string } {
  const rawUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!rawUrl || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
  }
  return { url: normalizeSupabaseUrl(rawUrl), key };
}

export async function supabaseRestGet<T>(
  path: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<T> {
  const { url, key } = supabaseRestConfig();
  const signal =
    options?.signal ??
    (options?.timeoutMs
      ? AbortSignal.timeout(options.timeoutMs)
      : AbortSignal.timeout(8000));

  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Supabase REST ${res.status}`);
  }

  return (await res.json()) as T;
}
