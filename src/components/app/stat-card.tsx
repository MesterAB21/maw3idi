"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";

export interface StatRow {
  label: string;
  value: number;
  color: string; // hex for the filled bar
}

function useMountedBar(value: number) {
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setW(value))
    );
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return w;
}

export function StatCardList({
  title,
  detailHref = "#",
  rows,
  className,
}: {
  title: string;
  detailHref?: string;
  rows: StatRow[];
  className?: string;
}) {
  const max = React.useMemo(
    () => Math.max(1, ...rows.map((r) => r.value)),
    [rows]
  );
  const { t } = useApp();
  return (
    <div
      className={cn(
        "rounded-xl bg-canvas px-6 py-6 shadow-card border border-hairline",
        className
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-2">
        <h3 className="text-title-md text-ink">{title}</h3>
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1 text-body-sm font-medium text-brand-primary hover:text-brand-primary-active"
        >
          {t("common.detail")}
          <ArrowRight className="size-3.5 rtl:rotate-180" />
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <BarRow key={row.label} row={row} max={max} />
        ))}
      </div>
    </div>
  );
}

function BarRow({ row, max }: { row: StatRow; max: number }) {
  const pct = Math.round((row.value / max) * 100);
  const w = useMountedBar(pct);
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-body-sm text-muted">
        {row.label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-card">
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${w}%`,
            backgroundColor: row.color,
            transitionDuration: "600ms",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
      <span className="w-8 shrink-0 text-end text-title-sm tabular-nums text-ink">
        {row.value}
      </span>
    </div>
  );
}

export function StatCardVolume({
  title,
  value,
  unit,
  percent,
  color,
  subtitle,
  detailHref,
  className,
}: {
  title: string;
  value: string | number;
  unit?: string;
  percent: number;
  color: string;
  subtitle?: string;
  detailHref?: string;
  className?: string;
}) {
  const w = useMountedBar(Math.min(100, percent));
  const { t } = useApp();
  return (
    <div
      className={cn(
        "rounded-xl bg-canvas px-6 py-6 shadow-card border border-hairline",
        className
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-2">
        <h3 className="text-title-md text-ink">{title}</h3>
        {detailHref ? (
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 text-body-sm font-medium text-brand-primary hover:text-brand-primary-active"
          >
            {t("common.detail")}
            <ArrowRight className="size-3.5 rtl:rotate-180" />
          </Link>
        ) : null}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-display-sm font-bold text-ink">
          {value}
        </span>
        {unit ? <span className="text-body-sm text-muted">{unit}</span> : null}
        <span className="ms-auto text-title-sm tabular-nums text-ink">
          {Math.round(percent)}%
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-card">
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${w}%`,
            backgroundColor: color,
            transitionDuration: "600ms",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
      {subtitle ? (
        <p className="mt-3 text-body-sm text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}