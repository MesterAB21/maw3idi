"use client";

import * as React from "react";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CalendarX,
  CheckCheck,
  Info,
  UserX,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { useCabinetRealtime, useRealtimeEvent } from "@/lib/realtime";
import { Sidebar } from "@/components/app/sidebar";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { useToast, type ToastVariant } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string;
  appointment_id?: string;
  is_read: boolean;
  created_at: string;
}

const NOTIF_META: Record<
  string,
  { variant: ToastVariant; icon: LucideIcon; iconClass: string }
> = {
  new_appointment: {
    variant: "brand",
    icon: CalendarCheck,
    iconClass: "text-brand-primary",
  },
  appointment_confirmed: {
    variant: "success",
    icon: CheckCircle2,
    iconClass: "text-success",
  },
  appointment_confirmed_manual: {
    variant: "brand",
    icon: CalendarCheck,
    iconClass: "text-brand-primary",
  },
  appointment_cancelled: {
    variant: "danger",
    icon: CalendarX,
    iconClass: "text-danger",
  },
  need_call: {
    variant: "warning",
    icon: AlertTriangle,
    iconClass: "text-avatar-orange",
  },
  appointment_completed: {
    variant: "info",
    icon: CalendarCheck,
    iconClass: "text-brand-primary",
  },
  appointment_no_show: {
    variant: "danger",
    icon: UserX,
    iconClass: "text-danger",
  },
};

function notifMeta(type: string) {
  return NOTIF_META[type] ?? { variant: "info" as ToastVariant, icon: Info, iconClass: "text-brand-primary" };
}

export function Topbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { t, authUser } = useApp();
  const { toast } = useToast();
  const [unread, setUnread] = React.useState(0);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [open, setOpen] = React.useState(false);
  const isStaff = Boolean(authUser) && !authUser?.isSuperAdmin;

  const refreshNotifications = React.useCallback(async () => {
    if (!isStaff) return;
    try {
      const res = await api.listNotifications({ page: 1, page_size: 10 });
      setItems(res.data);
      setUnread(res.unread);
    } catch {
      /* silenced: la cloche ne doit jamais casser la page */
    }
  }, [isStaff]);

  React.useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  // Push temps réel (doc §2.4) : toast en bas à droite + cloche à jour.
  useCabinetRealtime(isStaff);
  useRealtimeEvent("notification", (event) => {
    const n = event.notification as NotificationItem | undefined;
    if (n) {
      const meta = notifMeta(n.type);
      toast(n.title, meta.variant, n.body ?? undefined);
    }
    void refreshNotifications();
  });
  useRealtimeEvent("appointments_changed", () => {
    void refreshNotifications();
  });

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  };

  const timeAgo = (createdAt?: string) => {
    if (!createdAt) return "";
    const ms = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return t("time.minAgoLower", { n: 1 });
    if (minutes < 60) return t("time.minAgoLower", { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("time.hoursAgoLower", { n: hours });
    return t("time.daysAgoLower", { n: Math.floor(hours / 24) });
  };

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-hairline bg-canvas px-4 sm:px-6 lg:px-8">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate font-display text-display-md font-bold text-ink">
            {title}
          </h1>
          <span className="hidden text-muted md:inline">—</span>
          {subtitle ? (
            <span className="hidden truncate text-body-sm text-muted md:inline">
              {subtitle}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <LanguageSwitcher />

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative flex size-9 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-surface-card hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/15"
              aria-label={t("topbar.notifications")}
            >
              <Bell className="size-5" />
              {unread > 0 ? (
                <span className="absolute end-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-canvas">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : (
                <span className="absolute end-1.5 top-1.5 flex size-2 items-center justify-center rounded-full bg-danger ring-2 ring-canvas">
                  <span className="size-1 rounded-full bg-white" />
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-title-sm text-ink">{t("topbar.notifications")}</p>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[12px] font-medium text-brand-primary hover:opacity-80"
                >
                  <CheckCheck className="size-3.5" />
                  {t("notif.markAllRead")}
                </button>
              ) : null}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-3 py-6 text-center text-body-sm text-muted">
                  {t("notif.empty")}
                </p>
              ) : (
                items.map((n) => {
                  const meta = notifMeta(n.type);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-2.5 border-t border-hairline px-3 py-2.5"
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          meta.iconClass
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-ink">
                          {!n.is_read ? (
                            <span className="me-1.5 inline-block size-1.5 rounded-full bg-brand-primary" />
                          ) : null}
                          {n.title}
                        </p>
                        {n.body ? (
                          <p className="mt-0.5 text-[12px] text-muted">{n.body}</p>
                        ) : null}
                        <p className="mt-0.5 text-[11px] text-muted/80">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-surface-card hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/15"
          aria-label={t("topbar.help")}
        >
          <Info className="size-5" />
        </button>
      </div>
    </header>
  );
}