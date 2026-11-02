/** Shared SEO helpers — brand is always Motio2edit (never Motion2Edit / Motion2Ai). */

export const SITE_URL = "https://motio2edit.com";
export const SITE_NAME = "Motio2edit";
export const SITE_BRAND_DESCRIPTION =
  "Motio2edit.com is an AI-powered photo and video editing platform offering image enhancement, photo restoration, image upscaling, object removal, creative photo effects, AI editing tools, and video creation features.";

export const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/1IssfTbY1iUB1etzG4012PVyW3P2/social-images/social-1781815143053-file_0000000030e0720789c4ed52cd0751aa.webp";

export type PageSeoInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
};

/** TanStack Router `head()` meta + link fragments for a public page. */
export function pageHead(input: PageSeoInput) {
  const url = input.path ? `${SITE_URL}${input.path.startsWith("/") ? input.path : `/${input.path}`}` : SITE_URL;
  const image = input.image || DEFAULT_OG_IMAGE;
  const robots = input.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large";
  return {
    meta: [
      { title: input.title },
      { name: "description", content: input.description },
      { name: "robots", content: robots },
      { property: "og:title", content: input.title },
      { property: "og:description", content: input.description },
      { property: "og:type", content: input.type || "website" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: input.title },
      { name: "twitter:description", content: input.description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.ico`,
    description: SITE_BRAND_DESCRIPTION,
    sameAs: [] as string[],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_BRAND_DESCRIPTION,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/faq?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: SITE_BRAND_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan with starter credits; paid monthly plans available",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

export function faqPageJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: `${SITE_URL}${input.path}`,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    datePublished: input.datePublished || "2026-11-02",
    dateModified: input.dateModified || input.datePublished || "2026-11-02",
    mainEntityOfPage: `${SITE_URL}${input.path}`,
  };
}

/** Public paths for sitemap — no auth, checkout, or account surfaces. */
export const SITEMAP_PATHS: { path: string; changefreq: "weekly" | "monthly"; priority: string }[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/features", changefreq: "weekly", priority: "0.9" },
  { path: "/pricing", changefreq: "weekly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/faq", changefreq: "monthly", priority: "0.8" },
  { path: "/support", changefreq: "monthly", priority: "0.6" },
  { path: "/trust", changefreq: "monthly", priority: "0.6" },
  { path: "/security", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "monthly", priority: "0.4" },
  { path: "/terms", changefreq: "monthly", priority: "0.4" },
  { path: "/feedback", changefreq: "monthly", priority: "0.5" },
  { path: "/learn", changefreq: "weekly", priority: "0.8" },
  { path: "/learn/ai-photo-restoration", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/improve-old-photos", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/ai-image-upscaling", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/remove-objects-from-photos", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/circle-to-edit", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/ai-vs-traditional-editing", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/ai-video-editing", changefreq: "monthly", priority: "0.7" },
  { path: "/studio/image/circle-info", changefreq: "monthly", priority: "0.6" },
  { path: "/studio/image/remove-bg-info", changefreq: "monthly", priority: "0.6" },
];
