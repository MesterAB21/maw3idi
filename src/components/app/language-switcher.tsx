"use client";

import { LANGS } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { Lang } from "@/lib/types";

const ORDER: Lang[] = ["fr", "ar"];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useApp();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-hairline bg-surface-soft p-0.5",
        className
      )}
      role="group"
      aria-label={t("topbar.language")}
    >
      {ORDER.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/15",
            lang === l
              ? "bg-brand-primary text-white"
              : "text-muted hover:text-ink"
          )}
        >
          {l.toUpperCase()}
          <span className="sr-only"> ({LANGS[l]})</span>
        </button>
      ))}
    </div>
  );
}
