import {
  Check,
  PhoneCall,
  ArrowRight,
  CalendarDays,
  Clock,
  Eye,
} from "lucide-react";

import { avatarColor, initials } from "@/lib/utils";
import { StatusBadge } from "@/components/app/status-badge";

const ROWS = [
  {
    name: "Karim Haddad",
    phone: "+213 661 23 90 45",
    time: "10:30",
    status: "need_call" as const,
    action: "Appeler",
  },
  {
    name: "Meriam Ziani",
    phone: "+213 770 12 33 09",
    time: "11:00",
    status: "confirmation_envoyee" as const,
    action: "—",
  },
  {
    name: "Fatima Benali",
    phone: "+213 555 44 12 87",
    time: "09:00",
    status: "confirme" as const,
    action: "—",
  },
];

function MiniStat() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-hairline bg-canvas px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-5 items-center justify-center rounded-full bg-status-need-call-bg">
          <PhoneCall className="size-3 text-status-need-call" />
        </span>
        <div>
          <p className="text-[11px] font-semibold text-ink">Need Call</p>
          <p className="text-[11px] text-muted">2 RDV à traiter</p>
        </div>
      </div>
      <span className="font-display text-lg font-bold text-ink">2</span>
    </div>
  );
}

export function DashboardMockup() {
  return (
    <div className="relative">
      <div
        data-parallax="0.5"
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[32px] bg-brand-gradient/10 blur-2xl"
      />

      <div className="overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-card">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-hairline bg-surface-soft px-4 py-3">
          <span className="size-2.5 rounded-full bg-status-cancelled/80" />
          <span className="size-2.5 rounded-full bg-status-pending/80" />
          <span className="size-2.5 rounded-full bg-status-confirmed/80" />
          <span className="ml-3 rounded-md bg-canvas px-3 py-1 text-[11px] text-muted">
            Rendez-vous — Cabinet Dr. Amrani
          </span>
        </div>

        <div className="grid grid-cols-[220px_1fr]">
          {/* Mini sidebar */}
          <div className="hidden border-r border-hairline bg-surface-soft p-3 sm:block">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Principal
            </p>
            {["Dashboard", "Rendez-vous", "Calendrier"].map((n, i) => (
              <p
                key={n}
                className={`mb-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium ${
                  i === 1
                    ? "bg-brand-primary text-white"
                    : "text-body hover:bg-surface-card"
                }`}
              >
                {n}
              </p>
            ))}
          </div>

          {/* Mini dashboard content */}
          <div className="p-4">
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniStat />
              <div className="flex items-center justify-between rounded-xl border border-hairline bg-canvas px-4 py-3 shadow-sm">
                <div>
                  <p className="text-[11px] font-semibold text-ink">Confirmés</p>
                  <p className="text-[11px] text-muted">aujourd'hui</p>
                </div>
                <span className="font-display text-lg font-bold text-status-confirmed">
                  3
                </span>
              </div>
              <div className="hidden items-center justify-between rounded-xl border border-hairline bg-canvas px-4 py-3 shadow-sm sm:flex">
                <div>
                  <p className="text-[11px] font-semibold text-ink">RDV du jour</p>
                  <p className="text-[11px] text-muted">taux 60%</p>
                </div>
                <span className="font-display text-lg font-bold text-ink">5</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-hairline">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-hairline bg-surface-soft">
                    {["Patient", "Date", "Statut", "Action"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r, i) => (
                    <tr key={r.name} className="border-b border-hairline last:border-0">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                            style={{ backgroundColor: avatarColor(r.name) }}
                          >
                            {initials(r.name)}
                          </span>
                          <div>
                            <p
                              className={`text-[12px] font-semibold ${
                                i === 0 ? "animate-pulse-once text-ink" : "text-ink"
                              }`}
                            >
                              {r.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="flex items-center gap-1 text-[11px] text-muted">
                          <CalendarDays className="size-3" />
                          18/09
                          <Clock className="ml-1 size-3" />
                          {r.time}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {r.status === "need_call" ? (
                            <>
                              <span className="flex items-center gap-1 rounded-md bg-status-confirmed px-2 py-1 text-[10px] font-semibold text-white">
                                <Check className="size-3" />
                                Confirm
                              </span>
                              <span className="flex items-center gap-1 rounded-md bg-status-cancelled px-2 py-1 text-[10px] font-semibold text-white">
                                Cancel
                              </span>
                            </>
                          ) : (
                            <span className="flex size-6 items-center justify-center rounded-full border border-hairline bg-canvas text-muted">
                              <Eye className="size-3" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Voir → Comprendre → Agir annotation */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {["Voir", "Comprendre", "Agir"].map((t, i) => (
          <div key={t} className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-4 py-2 text-[13px] font-semibold text-white shadow-sm">
              {t}
            </span>
            {i < 2 ? (
              <ArrowRight className="size-4 text-brand-primary" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}