import type { Metadata, Viewport } from "next";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "./globals.css";
import "./brand.css";
import "./polish.css";
import "./pwa.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "رحلة التغيير", template: "%s | رحلة التغيير" },
  description: "منصة شخصية للالتزام بالعادات والمهام والتقدم اليومي.",
  applicationName: "رحلة التغيير",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7FBFA" },
    { media: "(prefers-color-scheme: dark)", color: "#071820" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>;
}
