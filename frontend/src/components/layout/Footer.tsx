"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Heart } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site-config";

interface FooterProps {
  className?: string;
  participantName?: string;
}

export function Footer({ className, participantName }: FooterProps) {
  const [year] = useState(() => new Date().getFullYear());
  const pathname = usePathname();
  const links = siteConfig.links;

  if (pathname === "/ai") return null;

  return <footer className={cn("site-footer", className)} aria-label="معلومات رحلة التغيير">
    <div className="site-footer-inner">
      <div className="site-footer-brand"><BrandLogo decorative /><div><strong>{siteConfig.name}</strong><p>{siteConfig.description}</p>{participantName && <small>رحلة {participantName}</small>}</div></div>
      {links.length > 0 && <nav className="site-footer-links" aria-label="روابط التواصل">{links.map((link) => link.external ? <a key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label}<ExternalLink size={13} aria-hidden="true" /></a> : <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>}
      <div className="site-footer-meta"><span>© {year} {siteConfig.owner}. جميع الحقوق محفوظة.</span><span className="site-footer-signature"><Heart size={13} aria-hidden="true" /> خطوة صغيرة كل يوم</span></div>
    </div>
  </footer>;
}
