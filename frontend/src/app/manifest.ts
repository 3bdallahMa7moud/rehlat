import type { MetadataRoute } from "next";

/** Install metadata for the existing Journey of Change brand assets. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "رحلة التغيير",
    short_name: "رحلة التغيير",
    description: "مساحة هادئة لمتابعة العادات والمهام والتقدم اليومي.",
    lang: "ar",
    dir: "rtl",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "portrait-primary",
    background_color: "#F7FBFA",
    theme_color: "#163B50",
    categories: ["productivity", "lifestyle"],
    icons: [{ src: "/brand/journey-mark.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
