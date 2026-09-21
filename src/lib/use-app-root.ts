"use client";

import { usePathname } from "next/navigation";

/**
 * Root of the current app section: "/app" (production) or "/test" (demo).
 * Shared components use it to build internal links so /test pages behave
 * exactly like /app pages while staying inside the test section.
 */
export function useAppRoot(): string {
  const pathname = usePathname();
  return pathname.startsWith("/test") ? "/test" : "/app";
}