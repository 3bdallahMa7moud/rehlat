import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function NotFound() {
  return (
    <main className="system-page">
      <section className="system-panel">
        <BrandLogo variant="full" decorative priority />
        <span className="system-code">404</span>
        <h1>الصفحة غير موجودة</h1>
        <p>الرابط قديم أو غير صحيح. ارجع إلى رحلتك اليومية واختر وجهتك من هناك.</p>
        <Link href="/dashboard" className="button button-primary button-lg">العودة إلى الرئيسية</Link>
      </section>
    </main>
  );
}
