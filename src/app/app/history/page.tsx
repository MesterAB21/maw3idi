"use client";

import * as React from "react";

import { useApp } from "@/lib/app-context";
import { AppointmentsTable } from "@/components/app/appointments-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryPage() {
  const { t } = useApp();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-body-sm text-muted">{t("history.description")}</p>
      <AppointmentsTable compact={false} initialFilter="ALL" mode="history" />
    </div>
  );
}