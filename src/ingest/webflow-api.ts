const WEBFLOW_API = "https://api.webflow.com/v2";
const PAGE_SIZE = 100;

export interface WebflowItem {
  id: string;
  lastUpdated?: string;
  createdOn?: string;
  fieldData: Record<string, unknown>;
}

interface ItemsResponse {
  items?: WebflowItem[];
}

export async function fetchCollectionPage(
  token: string,
  collectionId: string,
  offset = 0,
  limit = PAGE_SIZE
): Promise<{ items: WebflowItem[]; total: number | null }> {
  const url = `${WEBFLOW_API}/collections/${collectionId}/items?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Webflow ${res.status} for collection ${collectionId}: ${body}`
    );
  }
  const data = (await res.json()) as ItemsResponse & {
    pagination?: { total?: number };
  };
  return {
    items: data.items ?? [],
    total: data.pagination?.total ?? null,
  };
}

export async function fetchCollectionItems(
  token: string,
  collectionId: string
): Promise<WebflowItem[]> {
  const all: WebflowItem[] = [];
  let offset = 0;

  for (;;) {
    const { items } = await fetchCollectionPage(
      token,
      collectionId,
      offset,
      PAGE_SIZE
    );
    all.push(...items);
    if (items.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

export function fieldString(
  fieldData: Record<string, unknown>,
  slug: string
): string {
  const value = fieldData[slug];
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export function fieldImageUrl(
  fieldData: Record<string, unknown>,
  slug: string
): string | null {
  const value = fieldData[slug];
  if (!value) return null;
  if (typeof value === "string") return value || null;
  if (typeof value === "object" && value !== null && "url" in value) {
    const url = (value as { url?: unknown }).url;
    return typeof url === "string" && url.length > 0 ? url : null;
  }
  return null;
}

export function fieldDate(
  fieldData: Record<string, unknown>,
  slug: string
): string | null {
  const raw = fieldString(fieldData, slug);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Plain-text value from a CMS field for search embedding. */
export function fieldValueForSearch(
  fieldData: Record<string, unknown>,
  slug: string
): string {
  const value = fieldData[slug];
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && value !== null) {
    if ("url" in value && typeof (value as { url?: unknown }).url === "string") {
      return (value as { url: string }).url;
    }
    if ("name" in value && typeof (value as { name?: unknown }).name === "string") {
      return (value as { name: string }).name;
    }
  }
  return "";
}
