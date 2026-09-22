"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="system-page">
      <section className="system-panel">
        <BrandLogo variant="full" decorative priority />
        <span className="system-alert"><TriangleAlert size={26} /></span>
        <h1>تعذر فتح هذه الصفحة</h1>
        <p>حدث خطأ غير متوقع. جرّب مرة أخرى، أو ارجع إلى الصفحة الرئيسية.</p>
        <div className="system-actions">
          <button type="button" className="button button-primary button-lg" onClick={reset}>إعادة المحاولة</button>
          <Link href="/dashboard" className="button button-outline button-lg">الرئيسية</Link>
        </div>
      </section>
    </main>
  );
}
