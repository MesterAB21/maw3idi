"use client";

import * as React from "react";

import { Logo } from "@/components/brand/logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F0F4FC]">
      <div className="relative z-40 flex h-[600px] w-[1009px] min-w-[780px] flex-row overflow-hidden rounded-[2rem] shadow-2xl max-[1281px]:scale-[0.8]">
        <div className="relative flex w-1/2 flex-col gap-6 overflow-hidden px-10 py-[62px]">
          <Logo href="/" imageClassName="h-[200px]" />
          <h1 className="text-5xl font-bold leading-[60px]">
            Le rendez-vous qui se confirme tout seul.
          </h1>
          <p className="text-lg font-normal leading-8 text-[#62748E]">
            MAW3IDI confirme, relance et suit chaque rendez-vous par WhatsApp,
            Instagram et appel — pendant que vous soignez.
          </p>
          <div
            aria-hidden
            className="absolute bottom-0 left-0 h-[350px] w-[720px] -translate-x-1/2 translate-y-1/2 rotate-[15deg] bg-gradient-to-r from-[#2F80E4] via-[#6DA0E1] to-[#5B6AB2] opacity-50 blur-[64px]"
          />
        </div>
        {children}
      </div>
      <div
        aria-hidden
        className="absolute right-0 top-0 z-30 h-[350px] w-[720px] -translate-x-1/2 rotate-[11deg] bg-gradient-to-r from-[#2F80E4] via-[#6DA0E1] to-[#5B6AB2] opacity-[0.28] blur-[64px]"
      />
    </main>
  );
}