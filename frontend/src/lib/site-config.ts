export interface SiteLink {
  label: string;
  href: string;
  external?: boolean;
}

/** Keep only project-owned metadata here; empty links are intentionally hidden by Footer. */
export const siteConfig = {
  name: "رحلة التغيير",
  shortName: "رحلة التغيير",
  description: "مساحة هادئة لخطوات صغيرة تتراكم إلى تغيير حقيقي.",
  owner: "رحلة التغيير",
  links: [] as readonly SiteLink[],
} as const;
