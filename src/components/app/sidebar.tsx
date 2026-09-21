"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Building2,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  UserRound,
  UserRoundPlus,
  Users,
  History,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn, avatarColor, initials } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { useAppRoot } from "@/lib/use-app-root";
import type { TKey } from "@/lib/i18n";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  labelKey?: TKey;
  label?: string; // literal label override (e.g. test-only "Agent IA")
  icon: LucideIcon;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  testOnly?: boolean; // shown only inside the /test section
  superAdminTab?: string; // for superadmin tab navigation
}

const NAV: { sectionKey: TKey; items: NavItem[] }[] = [
  // hrefs are relative to the app root (/app or /test); see SidebarInner.
  {
    sectionKey: "nav.section.main",
    items: [
      { href: "/agent", label: "Agent IA", icon: Bot, testOnly: true },
      { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { href: "/appointments", labelKey: "nav.appointments", icon: CalendarDays },
      { href: "/patients", labelKey: "nav.patients", icon: UserRound },
      { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
      { href: "/history", labelKey: "nav.history", icon: History },
    ],
  },
  {
    sectionKey: "nav.section.account",
    items: [
      { href: "/settings", labelKey: "nav.settings", icon: Settings, adminOnly: true },
      { href: "/team", labelKey: "nav.team", icon: Users, adminOnly: true },
    ],
  },
  {
    sectionKey: "nav.section.superadmin",
    items: [
      { href: "/superadmin?tab=dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, superAdminOnly: true },
      { href: "/superadmin?tab=cabinets", labelKey: "nav.superadmin.cabinets", icon: Building2, superAdminOnly: true },
      { href: "/superadmin?tab=users", labelKey: "nav.superadmin.users", icon: Users, superAdminOnly: true },
    ],
  },
];

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const root = useAppRoot();
  const { role, authUser, switchRole, logout, t } = useApp();
  const isSuperAdmin = authUser?.isSuperAdmin ?? false;
  const userName = authUser?.name ?? "…";
  const userEmail = authUser?.email ?? "";
  const userInitials = authUser?.initials ?? "??";

  // Current superadmin tab (read from URL without useSearchParams to avoid
  // forcing a Suspense boundary on every /app page).
  const [currentTab, setCurrentTab] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setCurrentTab(new URLSearchParams(window.location.search).get("tab"));
  }, [pathname]);

  const isActive = (href: string) => {
    const qIndex = href.indexOf("?");
    if (qIndex === -1) {
      return pathname === href || pathname.startsWith(href + "/");
    }
    const path = href.slice(0, qIndex);
    if (pathname !== path && !pathname.startsWith(path + "/")) return false;
    const tab = new URLSearchParams(href.slice(qIndex + 1)).get("tab");
    if (tab) {
      return (currentTab ?? "cabinets") === tab;
    }
    return pathname === path;
  };

  const handleNavigate = (href: string) => {
    const qIndex = href.indexOf("?");
    if (qIndex !== -1) {
      setCurrentTab(new URLSearchParams(href.slice(qIndex + 1)).get("tab"));
    }
    onNavigate?.();
  };

  // Super admins get a dedicated sidebar: Cabinets + Utilisateurs only.
  const items = (isSuperAdmin
    ? NAV.filter((s) => s.sectionKey === "nav.section.superadmin").map((s) => ({
        ...s,
        items: s.items.filter((i) => !i.adminOnly && !i.testOnly),
      }))
    : NAV.map((s) => ({
        ...s,
        items: s.items.filter(
          (i) =>
            (!i.adminOnly || role === "ADMIN") &&
            (!i.superAdminOnly || isSuperAdmin) &&
            (!i.testOnly || root === "/test")
        ),
      })).filter((s) => s.items.length > 0)
  ).map((s) => ({
    ...s,
    items: s.items.map((i) => ({ ...i, href: root + i.href })),
  }));

  return (
    <div className="flex h-full flex-col bg-surface-soft">
      <div className="flex h-[84px] items-center justify-center border-b border-hairline">
        <a href="/" aria-label={t("sidebar.home")} className="inline-flex items-center">
          <LogoMark imageClassName="h-[72px]" />
        </a>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {items.map((section) => (
          <div key={section.sectionKey} className="mb-5">
            <p className="mb-2 px-3 text-caption uppercase text-muted">
              {t(section.sectionKey)}
            </p>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => handleNavigate(item.href)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3.5 py-2.5 text-title-sm transition-colors duration-150",
                        active
                          ? "bg-brand-primary text-white"
                          : "text-body hover:bg-surface-card hover:text-ink"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[18px] shrink-0",
                          active ? "text-white" : "text-muted"
                        )}
                      />
                      {item.label ?? (item.labelKey ? t(item.labelKey) : "")}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-hairline p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150 hover:bg-surface-card focus-visible:ring-3 focus-visible:ring-ring/15"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-title-sm font-semibold text-white"
                style={{ backgroundColor: avatarColor(userName) }}
              >
                {userInitials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-title-sm text-ink">
                  {userName}
                </span>
                <span className="block truncate text-body-sm text-muted">
                  {isSuperAdmin
                    ? t("superadmin.badge")
                    : role === "ADMIN"
                      ? t("role.admin")
                      : t("role.secretary")}
                </span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>{userEmail || t("sidebar.account")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={switchRole}>
              <UserRoundPlus className="text-muted" />
              {role === "ADMIN"
                ? t("sidebar.viewAsSecretary")
                : t("sidebar.viewAsAdmin")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-danger focus:bg-status-cancelled-bg focus:text-danger"
              onClick={() => logout()}
            >
              <LogOut />
              {t("nav.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { t } = useApp();

  return (
    <>
      <Button
        variant="icon-ghost"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label={t("sidebar.openMenu")}
      >
        <Menu className="size-5" />
      </Button>

      {/* Desktop */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[210px] border-e border-hairline lg:block">
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 animate-overlay-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 start-0 w-[280px] shadow-modal animate-in slide-in-from-left-full duration-300 ease-in-expo rtl:slide-in-from-right-full">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute end-3 top-4 z-10 flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-card"
              aria-label={t("sidebar.closeMenu")}
            >
              <X className="size-5" />
            </button>
            <SidebarInner onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}