"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useApp } from "@/lib/app-context";

/** Bare /app entry: route to the right home instead of showing a 404. */
export default function AppIndexPage() {
  const router = useRouter();
  const { loading, authUser } = useApp();

  React.useEffect(() => {
    if (loading) return;
    if (!authUser) {
      router.replace("/login");
      return;
    }
    router.replace(authUser.isSuperAdmin ? "/app/superadmin" : "/app/dashboard");
  }, [loading, authUser, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft">
      <span className="text-body-sm text-muted">Chargement…</span>
    </div>
  );
}
