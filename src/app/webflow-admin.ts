const API = "https://api.webflow.com/v2";

async function wf<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "accept-version": "2.0.0",
    },
  });
  if (!res.ok) {
    throw new Error(`Webflow ${res.status} ${path}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export interface WfSite {
  id: string;
  displayName?: string;
  shortName?: string;
  previewUrl?: string;
  customDomains?: { url?: string }[];
}

export interface WfField {
  id: string;
  slug: string;
  displayName: string;
  type: string;
}

export interface WfCollection {
  id: string;
  displayName: string;
  slug: string;
  fields?: WfField[];
}

export async function listSites(token: string): Promise<WfSite[]> {
  const data = await wf<{ sites?: WfSite[] }>(token, "/sites");
  return data.sites ?? [];
}

export async function getSite(token: string, siteId: string): Promise<WfSite> {
  return wf<WfSite>(token, `/sites/${siteId}`);
}

export async function listCollections(
  token: string,
  siteId: string
): Promise<WfCollection[]> {
  const data = await wf<{ collections?: WfCollection[] }>(
    token,
    `/sites/${siteId}/collections`
  );
  return data.collections ?? [];
}

export async function getCollection(
  token: string,
  collectionId: string
): Promise<WfCollection> {
  return wf<WfCollection>(token, `/collections/${collectionId}`);
}

export function publicSiteOrigin(site: WfSite): string {
  const custom = site.customDomains?.[0]?.url;
  if (custom) {
    return custom.startsWith("http") ? custom.replace(/\/$/, "") : `https://${custom.replace(/\/$/, "")}`;
  }
  if (site.shortName) {
    return `https://${site.shortName}.webflow.io`;
  }
  return "";
}

export function guessFields(fields: WfField[] | undefined): {
  title: string;
  body: string;
  excerpt: string;
  slug: string;
  image: string;
  date: string;
} {
  const list = fields ?? [];
  const byType = (t: string) => list.filter((f) => f.type === t);
  const slugOf = (pred: (f: WfField) => boolean, fallback: string) =>
    list.find(pred)?.slug ?? fallback;

  const rich = byType("RichText");
  const plain = byType("PlainText");
  const images = byType("Image");
  const dates = byType("DateTime").concat(byType("Date"));

  return {
    title: slugOf((f) => f.slug === "name" || f.slug === "title", plain[0]?.slug ?? "name"),
    body: rich[0]?.slug ?? plain.find((f) => f.slug !== "name")?.slug ?? "name",
    excerpt:
      slugOf(
        (f) =>
          /excerpt|summary|blurb|description|subtitle/i.test(f.slug) ||
          /excerpt|summary|blurb/i.test(f.displayName),
        plain.find((f) => f.slug !== "name")?.slug ?? ""
      ),
    slug: slugOf((f) => f.slug === "slug" || f.type === "Link", "slug"),
    image: images[0]?.slug ?? "",
    date: dates[0]?.slug ?? "",
  };
}
