"use client";

import { AppointmentsTable, type Filter } from "@/components/app/appointments-table";

const VALID: Filter[] = ["TODAY", "NEED_CALL", "CONFIRMED", "PENDING", "CANCELLED"];

export default function AppointmentsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const initialFilter: Filter =
    searchParams.filter && VALID.includes(searchParams.filter as Filter)
      ? (searchParams.filter as Filter)
      : "ALL";

  return (
    <div>
      <AppointmentsTable initialLoading initialFilter={initialFilter} />
    </div>
  );
}
