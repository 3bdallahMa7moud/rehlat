import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const metadata: Metadata = { title: "غير مصرح" };

export default function ForbiddenPage() {
  return (
    <main className="system-page">
      <section className="system-panel">
        <BrandLogo variant="full" decorative priority />
        <span className="system-alert"><ShieldX size={26} /></span>
        <h1>هذه المساحة للمشرف</h1>
        <p>حسابك الحالي لا يملك صلاحية فتح صفحات الإدارة.</p>
        <Link href="/dashboard" className="button button-primary button-lg">العودة إلى رحلتي</Link>
      </section>
    </main>
  );
}
