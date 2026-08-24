/**
 * CLIENT CONFIG — change this file for each Webflow site.
 *
 * 1. Set WEBFLOW_SITE_BASE_URL to the public origin (no trailing slash).
 * 2. For each CMS collection you want searchable, add an entry with:
 *    - collectionId  from Webflow (CMS → collection → Settings → Collection ID)
 *    - contentType   a stable label used as the `types` filter (blog, webinar, ebook, …)
 *    - urlPattern    public URL; `{slug}` is replaced with the slug field
 *    - fields        Webflow field slugs (they differ per site / collection)
 *
 * Adding Sanity or Contentful later: keep content_type + these item fields;
 * only the fetch layer and `source` / id prefix change.
 */

export const WEBFLOW_SITE_BASE_URL = "https://www.example.com";

export interface FieldSlugs {
  title: string;
  body: string;
  excerpt: string;
  slug: string;
  image: string;
  date: string;
}

export interface CollectionConfig {
  collectionId: string;
  contentType: string;
  urlPattern: string;
  fields: FieldSlugs;
}

export const WEBFLOW_COLLECTIONS: CollectionConfig[] = [
  {
    collectionId: "REPLACE_BLOG_COLLECTION_ID",
    contentType: "blog",
    urlPattern: `${WEBFLOW_SITE_BASE_URL}/blog/{slug}`,
    fields: {
      title: "name",
      body: "post-body",
      excerpt: "post-summary",
      slug: "slug",
      image: "main-image",
      date: "published-on",
    },
  },
  {
    collectionId: "REPLACE_WEBINAR_COLLECTION_ID",
    contentType: "webinar",
    urlPattern: `${WEBFLOW_SITE_BASE_URL}/webinars/{slug}`,
    fields: {
      title: "name",
      body: "description",
      excerpt: "short-description",
      slug: "slug",
      image: "thumbnail",
      date: "event-date",
    },
  },
  {
    collectionId: "REPLACE_EBOOK_COLLECTION_ID",
    contentType: "ebook",
    urlPattern: `${WEBFLOW_SITE_BASE_URL}/resources/{slug}`,
    fields: {
      title: "name",
      body: "overview",
      excerpt: "blurb",
      slug: "slug",
      image: "cover-image",
      date: "release-date",
    },
  },
];
