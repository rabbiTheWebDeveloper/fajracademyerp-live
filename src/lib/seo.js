/**
 * SEO Configuration — Single source of truth.
 * Import from here in all metadata exports to avoid duplication.
 */

export const siteConfig = {
  name: "Fajr Academy",
  url: "https://app.fajracademy.io",
  tagline: "Comprehensive Academy Management System",
  description:
    "Fajr Academy ERP system for students, teachers, and staff. Manage classes, schedules, salaries, and more in one dashboard.",
  descriptionEn:
    "Fajr Academy ERP system for students, teachers, and staff. Manage classes, schedules, salaries, and more in one dashboard.",
  keywords: [
    "Fajr Academy",
    "Academy ERP",
    "Education Management",
    "Student Portal",
    "Teacher Portal",
    "School ERP",
    "Online Academy",
  ],
  author: "Fajr Academy Team",
  twitter: "@fajracademy",
  locale: "en_US",
  /** Social profiles for sameAs in JSON-LD */
  social: {
    facebook: "https://www.facebook.com/fajracademybd",
    youtube: "https://www.youtube.com/@fajracademybd",
  },
  images: {
    og: "/og-image.jpg",
    twitter: "/twitter-image.jpg",
    logo: "/fajr-logo.png",
  },
};

/**
 * Build a full canonical URL from a path.
 * @param {string} path - e.g. "/registration"
 */
export const getCanonicalUrl = (path = "/") =>
  `${siteConfig.url}${path === "/" ? "" : path}`;

/**
 * Shared Open Graph image block reused across every page.
 */
export const defaultOgImages = [
  {
    url: siteConfig.images.og,
    width: 1200,
    height: 630,
    alt: `${siteConfig.name} — ই-কমার্স প্লাটফর্ম`,
    type: "image/jpeg",
  },
];

/**
 * Build complete, non-duplicated metadata for a given page.
 *
 * @param {{
 *   title?: string,
 *   description?: string,
 *   path?: string,
 *   noIndex?: boolean,
 *   keywords?: string[],
 *   ogType?: string,
 *   ogImage?: string,
 * }} options
 */

/* ─── JSON-LD Helpers ─── */

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject",
      url: `${siteConfig.url}${siteConfig.images.logo}`,
    },
    description: siteConfig.descriptionEn,
    sameAs: Object.values(siteConfig.social),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["English"],
    },
  };
}



export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: siteConfig.url,
    description: siteConfig.descriptionEn,
  };
}

export function faqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.path),
    })),
  };
}

export function webPageSchema({ title, description, path, dateModified }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${getCanonicalUrl(path)}#webpage`,
    url: getCanonicalUrl(path),
    name: title,
    description,
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    about: { "@id": `${siteConfig.url}/#organization` },
    dateModified: dateModified || new Date().toISOString(),
    inLanguage: "en-US",
    breadcrumb: { "@id": `${getCanonicalUrl(path)}#breadcrumb` },
  };
}
