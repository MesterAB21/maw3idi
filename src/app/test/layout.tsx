"use client";

import * as React from "react";

import { AppProvider } from "@/lib/app-context";
import { AppShell } from "@/components/app/app-shell";
import { TestSessionGate } from "./test-session";

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TestSessionGate>
      <AppProvider>
        <AppShell basePath="/test">{children}</AppShell>
      </AppProvider>
    </TestSessionGate>
  );
}