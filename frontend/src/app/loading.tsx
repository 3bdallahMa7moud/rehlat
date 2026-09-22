import { LoaderCircle } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function Loading() {
  return (
    <main className="system-page" aria-live="polite" aria-busy="true">
      <section className="system-panel system-loading">
        <BrandLogo decorative priority />
        <LoaderCircle className="animate-spin" size={28} />
        <strong>نجهّز محطتك التالية...</strong>
      </section>
    </main>
  );
}
