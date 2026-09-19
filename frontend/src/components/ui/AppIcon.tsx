import type { SVGProps } from "react";
import { Bot, Focus, Medal, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

export type AppIconName = "mosque" | "quran" | "honor" | "assistant" | "focus";

type Props = SVGProps<SVGSVGElement> & { name: AppIconName; size?: number };

function MosqueMark({ className, size = 24, ...props }: Omit<Props, "name">) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" className={className} {...props}>
      <path d="M8 39h32M12 39V28h24v11M17 28v-7.5a7 7 0 0 1 14 0V28M24 8v5m-3-2h6M9 28v-9m30 9v-9M6 19h6m24 0h6M14 39V28m20 11V28" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 28c0-3.1 2.2-5.6 5-5.6s5 2.5 5 5.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function QuranMark({ className, size = 24, ...props }: Omit<Props, "name">) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" className={className} {...props}>
      <path d="M8 11.5c5.7-2.7 10.8-1.8 16 2.1v25.4c-5.2-3.8-10.3-4.8-16-2.1V11.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M40 11.5c-5.7-2.7-10.8-1.8-16 2.1v25.4c5.2-3.8 10.3-4.8 16-2.1V11.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M16 20c2.3-1 4.2-.9 6 .1m10-.1c-2.3-1-4.2-.9-6 .1M16 27c2.3-1 4.2-.9 6 .1m10-.1c-2.3-1-4.2-.9-6 .1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AppIcon({ name, className, size = 24, ...props }: Props) {
  const shared = { className: cn("shrink-0", className), size, ...props };
  if (name === "mosque") return <MosqueMark {...shared} />;
  if (name === "quran") return <QuranMark {...shared} />;
  if (name === "honor") return <Medal {...shared} />;
  if (name === "focus") return <Focus {...shared} />;
  return <span className={cn("relative inline-grid place-items-center", className)}><Bot size={size} {...props} /><Sparkles size={Math.round(size * 0.42)} className="absolute -left-1 -top-1 text-[var(--accent-strong)]" /></span>;
}
