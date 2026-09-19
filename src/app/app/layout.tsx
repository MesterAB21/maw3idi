"use client";

import * as React from "react";
import { notFound, usePathname, useRouter } from "next/navigation";

import { useApp } from "@/lib/app-context";
import type { TKey } from "@/lib/i18n";
import { Topbar } from "@/components/app/topbar";
import { AppointmentDrawer } from "@/components/app/appointment-drawer";

function getMeta(pathname: string, cabinetName: string): { titleKey: TKey; subtitle: string } {
  if (pathname.startsWith("/app/dashboard"))
    return { titleKey: "title.dashboard", subtitle: cabinetName };
  if (pathname.startsWith("/app/appointments"))
    return { titleKey: "title.appointments", subtitle: cabinetName };
  if (pathname.startsWith("/app/patients"))
    return { titleKey: "title.patients", subtitle: cabinetName };
  if (pathname.startsWith("/app/calendar"))
    return { titleKey: "title.calendar", subtitle: `${cabinetName} · Google Calendar` };
  if (pathname.startsWith("/app/history"))
    return { titleKey: "title.history", subtitle: cabinetName };
  if (pathname.startsWith("/app/settings"))
    return { titleKey: "title.settings", subtitle: cabinetName };
  if (pathname.startsWith("/app/team"))
    return { titleKey: "title.team", subtitle: cabinetName };
  if (pathname.startsWith("/app/superadmin"))
    return { titleKey: "superadmin.title", subtitle: "MAW3IDI" };
  return { titleKey: "title.dashboard", subtitle: cabinetName };
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { cabinetName, t, loading, authUser, cabinet } = useApp();
  const meta = getMeta(pathname, cabinetName);

  // Admins whose cabinet is not linked with Google are forced through the
  // calendar onboarding in settings (super admins and secretaries exempt).
  React.useEffect(() => {
    if (loading || !authUser) return;
    if (authUser.isSuperAdmin) return;
    if (authUser.role !== "ADMIN") return;
    if (!cabinet || cabinet.liee_avec_google) return;
    if (pathname.startsWith("/app/settings")) return;
    router.replace("/app/settings?onboard=calendar");
  }, [loading, authUser, cabinet, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-soft">
        <span className="text-body-sm text-muted">Chargement…</span>
      </div>
    );
  }

  if (!authUser) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-surface-soft">
      <AppointmentDrawer />
      <div className="lg:ps-[210px]">
        <Topbar title={t(meta.titleKey)} subtitle={meta.subtitle} />
        <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}