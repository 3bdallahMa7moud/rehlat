import Image from "next/image";
import { cn } from "@/lib/cn";

interface BrandLogoProps {
  variant?: "full" | "mark";
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}

export function BrandLogo({ variant = "mark", className, priority = false, decorative = false }: BrandLogoProps) {
  const isFull = variant === "full";

  return (
    <span className={cn("brand-logo", isFull ? "brand-logo-full" : "brand-logo-mark", className)}>
      <Image
        src={isFull ? "/brand/journey-logo.png" : "/brand/journey-mark.png"}
        alt={decorative ? "" : "رحلة التغيير"}
        aria-hidden={decorative || undefined}
        width={isFull ? 1024 : 512}
        height={isFull ? 1024 : 512}
        priority={priority}
        sizes={isFull ? "(max-width: 640px) 150px, 180px" : "56px"}
      />
    </span>
  );
}
