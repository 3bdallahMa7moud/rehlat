"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AnimatedPage({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="page-transition" key={pathname}>
      {children}
    </div>
  );
}
