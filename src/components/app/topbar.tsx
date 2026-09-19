"use client";

import * as React from "react";
import { Bell, Info, CheckCheck } from "lucide-react";

import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { useCabinetRealtime, useRealtimeEvent } from "@/lib/realtime";
import { Sidebar } from "@/components/app/sidebar";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { useToast } from "@/components/ui/toast";
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

  // Push temps réel (doc §2.4) : la cloche se met à jour instantanément.
  useCabinetRealtime(isStaff);
  useRealtimeEvent("notification", (event) => {
    const n = event.notification as NotificationItem | undefined;
    if (n) toast(n.title, "success");
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
                items.map((n) => (
                  <div
                    key={n.id}
                    className="border-t border-hairline px-3 py-2.5"
                  >
                    <p className="text-[13px] font-semibold text-ink">
                      {!n.is_read ? <span className="me-1.5 inline-block size-1.5 rounded-full bg-brand-primary" /> : null}
                      {n.title}
                    </p>
                    {n.body ? (
                      <p className="mt-0.5 text-[12px] text-muted">{n.body}</p>
                    ) : null}
                  </div>
                ))
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