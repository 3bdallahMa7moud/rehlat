import type { Metadata } from "next";
import { AppRoute } from "@/components/layout/AppRoute";

export const metadata: Metadata = {
  title: "مساعد رحلة التغيير",
  description: "مساعد شخصي لتنظيم مهام اليوم وتحويل أهدافك إلى خطوات واضحة قابلة للتنفيذ.",
};

export default function AiPage() { return <AppRoute page="ai" />; }
