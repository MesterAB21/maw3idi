"use client";

import { AppShell } from "@/components/app/app-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell basePath="/app">{children}</AppShell>;
}