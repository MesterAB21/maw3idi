"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Building2, CalendarClock, LockKeyhole, Phone, Loader2, Calendar, ChevronRight, CheckCircle, XCircle } from "lucide-react";

import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import type { Cabinet } from "@/lib/types";
import type { TKey } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvailabilityForm, type AvailabilityFormHandle } from "@/components/app/availability-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-body-sm font-medium text-ink">
      {children}
    </label>
  );
}

type SettingsTab = "dispos" | "auto" | "infos" | "google";

function SettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { cabinet, t, role, switchRole, updateCabinet, updateAvailability, fetchCabinet, authUser, logout } = useApp();
  const { toast } = useToast();

  // Determine mode
  const cabinetParam = searchParams.get("cabinet");
  const onboard = searchParams.get("onboard") === "calendar";
  const integration = searchParams.get("integration") === "google-calendar";
  const callbackStatus = searchParams.get("status");
  const isSuperAdmin = authUser?.isSuperAdmin ?? false;
  const isManaged = Boolean(cabinetParam) && isSuperAdmin;

  // State
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [needDelay, setNeedDelay] = React.useState(2);
  const [needUnit, setNeedUnit] = React.useState<"minutes" | "hours">("hours");
  const [duration, setDuration] = React.useState(30);
  const [channels, setChannels] = React.useState({ whatsapp: true, instagram: true, call: true });
  const [cabinetName, setCabinetName] = React.useState("");
  const [cabinetAgent, setCabinetAgent] = React.useState("");
  const [cabinetLocation, setCabinetLocation] = React.useState("");
  const [cabinetDescription, setCabinetDescription] = React.useState("");
  const [cabinetMapsLink, setCabinetMapsLink] = React.useState("");
  const [managedCab, setManagedCab] = React.useState<Cabinet | null>(null);
  const [googleStatus, setGoogleStatus] = React.useState<{ connected: boolean; email?: string }>({ connected: false });
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [changeAccountConfirm, setChangeAccountConfirm] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("dispos");
  const [availDirty, setAvailDirty] = React.useState(false);
  const availRef = React.useRef<AvailabilityFormHandle | null>(null);

  // Snapshot of the last loaded/saved values → save buttons stay disabled
  // while nothing changed.
  const initialRef = React.useRef<{
    name: string; agent: string; location: string; description: string;
    maps: string; duration: number; needDelay: number; needUnit: "minutes" | "hours";
  } | null>(null);
  const snapshotCurrent = React.useCallback(() => {
    initialRef.current = {
      name: cabinetName, agent: cabinetAgent, location: cabinetLocation,
      description: cabinetDescription, maps: cabinetMapsLink,
      duration, needDelay, needUnit,
    };
  }, [cabinetName, cabinetAgent, cabinetLocation, cabinetDescription, cabinetMapsLink, duration, needDelay, needUnit]);

  // Target cabinet (own or managed)
  const displayCab: Cabinet | null = isManaged ? managedCab : cabinet;
  const cabinetId: string | undefined = isManaged ? (cabinetParam ?? undefined) : (cabinet?.id ?? undefined);

  const populateFromCabinet = React.useCallback((cab: Cabinet) => {
    setCabinetName(cab.nom_cabinet);
    setCabinetAgent(cab.nom_agent);
    setCabinetLocation(cab.localisation);
    setCabinetDescription(cab.description || "");
    setCabinetMapsLink(cab.maps_link || "");
    const dur = cab.slot_duration_minutes;
    const nd = Math.floor(cab.need_call_threshold_minutes / 60);
    const nu = cab.need_call_threshold_minutes >= 60 ? "hours" as const : "minutes" as const;
    setDuration(dur);
    setNeedDelay(nd);
    setNeedUnit(nu);
    initialRef.current = {
      name: cab.nom_cabinet, agent: cab.nom_agent, location: cab.localisation,
      description: cab.description || "", maps: cab.maps_link || "",
      duration: dur, needDelay: nd, needUnit: nu,
    };
  }, []);

  const loadManagedCabinet = React.useCallback(async (id: string) => {
    setLoading(true);
    try {
      const cab = await api.getCabinet(id);
      setManagedCab(cab);
      populateFromCabinet(cab);
    } catch (err) {
      console.error("Failed to load cabinet:", err);
      toast(t("settings.cabinet.saveError"), "danger");
    } finally {
      setLoading(false);
    }
  }, [populateFromCabinet, t, toast]);

  const loadGoogleStatus = React.useCallback(async (id: string) => {
    try {
      const st = await api.getGoogleCalendarStatus(id);
      setGoogleStatus({ connected: st.connected, email: st.google_account_email });
    } catch (err) {
      console.error("Failed to load Google Calendar status:", err);
    }
  }, []);

  // Load data for managed mode / own mode
  React.useEffect(() => {
    if (isManaged && cabinetId) {
      loadManagedCabinet(cabinetId);
    } else if (!isManaged && cabinet) {
      setLoading(false);
      populateFromCabinet(cabinet);
    } else if (!isManaged && !cabinet) {
      setLoading(false);
    }
  }, [isManaged, cabinetId, cabinet, loadManagedCabinet, populateFromCabinet]);

  // Load Google Calendar status
  React.useEffect(() => {
    if (cabinetId) {
      loadGoogleStatus(cabinetId);
    }
  }, [cabinetId, loadGoogleStatus]);

  // Handle onboarding redirect from Google callback: normalize the URL to the
  // onboard flow while preserving the callback status for the error widget.
  React.useEffect(() => {
    if (integration && callbackStatus) {
      const next = `${pathname}?onboard=calendar&integration=google-calendar&status=${callbackStatus}${cabinetParam ? `&cabinet=${cabinetParam}` : ""}`;
      if (window.location.search !== next.slice(pathname.length)) {
        router.replace(next);
      }
    }
  }, [integration, callbackStatus, pathname, cabinetParam, router]);

  const toggleChannel = (k: keyof typeof channels) => {
    setChannels((c) => ({ ...c, [k]: !c[k] }));
    toast(t(channels[k] ? "settings.channels.toastOff" : "settings.channels.toastOn", { k }), channels[k] ? "danger" : "success");
  };

  const handleSaveCabinet = async () => {
    if (!cabinetId) return;
    setSaving(true);
    try {
      const payload = {
        nom_cabinet: cabinetName,
        nom_agent: cabinetAgent,
        localisation: cabinetLocation,
        description: cabinetDescription,
        maps_link: cabinetMapsLink,
        slot_duration_minutes: duration,
        need_call_threshold_minutes: needUnit === "hours" ? needDelay * 60 : needDelay,
      };
      if (isManaged) {
        const updated = await api.updateCabinet(cabinetId, payload);
        setManagedCab(updated);
        toast(t("settings.cabinet.saved"), "success");
      } else {
        await updateCabinet(payload);
        toast(t("settings.cabinet.saved"), "success");
        await fetchCabinet();
      }
      snapshotCurrent();
    } catch (err) {
      console.error(err);
      toast(t("settings.cabinet.saveError"), "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvailability = async (availability: Array<{ day_of_week: number; start_time: string; end_time: string; is_active: boolean }>) => {
    if (!cabinetId) return;
    // No toast here: the single dispos save button toasts once for everything.
    if (isManaged) {
      await api.replaceAvailability(cabinetId, availability);
    } else {
      await updateAvailability(availability);
    }
  };

  // Single save for the whole "Disponibilités" tab: duration + need-call
  // threshold + weekly slots, with ONE toast.
  const handleSaveDispos = async () => {
    if (!cabinetId) return;
    setSaving(true);
    try {
      const cabinetPayload = {
        slot_duration_minutes: duration,
        need_call_threshold_minutes: needUnit === "hours" ? needDelay * 60 : needDelay,
      };
      if (isManaged) {
        const updated = await api.updateCabinet(cabinetId, cabinetPayload);
        setManagedCab(updated);
      } else {
        await updateCabinet(cabinetPayload);
      }
      if (availDirty) {
        await availRef.current?.save();
      }
      snapshotCurrent();
      toast(t("settings.availability.saved"), "success");
      if (!isManaged) await fetchCabinet();
    } catch (err) {
      console.error(err);
      toast(t("settings.availability.saveError"), "danger");
    } finally {
      setSaving(false);
    }
  };

  const baseline = initialRef.current;
  const disposDirty =
    availDirty ||
    (baseline !== null &&
      (duration !== baseline.duration ||
        needDelay !== baseline.needDelay ||
        needUnit !== baseline.needUnit));
  const infosDirty =
    baseline !== null &&
    (cabinetName !== baseline.name ||
      cabinetAgent !== baseline.agent ||
      cabinetLocation !== baseline.location ||
      cabinetDescription !== baseline.description ||
      cabinetMapsLink !== baseline.maps);

  const handleConnectGoogle = async () => {
    if (!cabinetId) return;
    setGoogleLoading(true);
    try {
      const res = await api.connectGoogleCalendar(cabinetId);
      window.location.href = res.url;
    } catch (err) {
      console.error(err);
      toast(t("errors.disconnectCalendar"), "danger");
      setGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!cabinetId) return;
    setGoogleLoading(true);
    try {
      await api.disconnectGoogleCalendar(cabinetId);
      setGoogleStatus({ connected: false });
      toast("Google Calendar disconnected", "success");
    } catch (err) {
      console.error(err);
      toast(t("errors.disconnectCalendar"), "danger");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSyncGoogle = async () => {
    if (!cabinetId) return;
    setGoogleLoading(true);
    try {
      await api.syncGoogleCalendar(cabinetId);
      toast("Calendar synchronized", "success");
    } catch (err) {
      console.error(err);
      toast(t("errors.syncCalendar"), "danger");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleChangeAccount = async () => {
    setChangeAccountConfirm(false);
    await handleConnectGoogle();
  };

  const handleLogout = async () => {
    await logout();
  };

  // Onboarding widget visibility
  const showErrorWidget = onboard && callbackStatus === "error";
  const showOnboardWidget = onboard && !googleStatus.connected && !showErrorWidget;
  const showConfigureWidget = onboard && googleStatus.connected && !showErrorWidget;

  // Restricted access for non-admins (own cabinet mode)
  if (!isManaged && role !== "ADMIN") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-hairline bg-canvas px-6 py-16 text-center shadow-card">
        <span className="flex size-16 items-center justify-center rounded-full bg-surface-card">
          <LockKeyhole className="size-8 text-muted" strokeWidth={1.5} />
        </span>
        <h2 className="text-title-md text-ink">{t("settings.restricted.title")}</h2>
        <p className="text-body-sm text-muted">{t("settings.restricted.body")}</p>
        <Button variant="secondary" size="sm" onClick={switchRole}>
          {t("settings.restricted.viewAdmin")}
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Onboarding Widgets */}
      {(showOnboardWidget || showErrorWidget || showConfigureWidget) && (
        <Card className="border-brand-primary">
          <CardContent className="pt-6">
            {showErrorWidget && (
              <div className="flex flex-col items-center gap-4 text-center">
                <XCircle className="size-12 text-danger" />
                <h3 className="text-title-md text-ink">{t("settings.onboard.calendar.errorTitle")}</h3>
                <p className="text-body-sm text-muted max-w-md">{t("settings.onboard.calendar.errorBody")}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="danger" onClick={handleLogout}>
                    {t("settings.onboard.calendar.logout")}
                  </Button>
                  <Button variant="primary" onClick={handleConnectGoogle} disabled={googleLoading}>
                    {googleLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    {t("settings.onboard.calendar.authorize")}
                  </Button>
                </div>
              </div>
            )}

            {showOnboardWidget && (
              <div className="flex flex-col items-center gap-4 text-center">
                <Calendar className="size-12 text-brand-primary" />
                <h3 className="text-title-md text-ink">{t("settings.onboard.calendar.title")}</h3>
                <p className="text-body-sm text-muted max-w-md">{t("settings.onboard.calendar.subtitle")}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="secondary" onClick={handleLogout}>
                    {t("settings.onboard.calendar.logout")}
                  </Button>
                  <Button variant="primary" onClick={handleConnectGoogle} disabled={googleLoading}>
                    {googleLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    {t("settings.onboard.calendar.authorize")}
                  </Button>
                </div>
              </div>
            )}

            {showConfigureWidget && (
              <div className="flex flex-col items-center gap-4 text-center">
                <CheckCircle className="size-12 text-success" />
                <h3 className="text-title-md text-ink">{t("settings.onboard.calendar.configureTitle")}</h3>
                <p className="text-body-sm text-muted max-w-md">{t("settings.onboard.calendar.configureSubtitle")}</p>
                <Button variant="primary" size="lg" onClick={() => router.replace(`${pathname}${cabinetParam ? `?cabinet=${cabinetParam}` : ""}`)}>
                  <ChevronRight className="size-4 mr-2" />
                  {t("settings.onboard.calendar.continue")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dispos">
            <CalendarClock className="size-4 mr-2" />
            {t("settings.tab.availability")}
          </TabsTrigger>
          <TabsTrigger value="auto">
            <Phone className="size-4 mr-2" />
            {t("settings.tab.automation")}
          </TabsTrigger>
          <TabsTrigger value="infos">
            <Building2 className="size-4 mr-2" />
            {t("settings.tab.info")}
          </TabsTrigger>
          <TabsTrigger value="google">
            <Calendar className="size-4 mr-2" />
            {t("settings.tab.google")}
          </TabsTrigger>
        </TabsList>

        {/* Disponibilités */}
        <TabsContent value="dispos" className="focus-visible:ring-0 focus-visible:ring-offset-0">
          <div className="flex flex-col gap-6">
            {/* Single save for the whole tab */}
            <div className="flex items-center justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveDispos}
                disabled={saving || !disposDirty}
              >
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {t("common.save")}
              </Button>
            </div>
            {/* Durée des rendez-vous */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-1 text-title-md text-ink">{t("settings.duration.title")}</h3>
                <p className="mb-4 text-body-sm text-muted">{t("settings.duration.subtitle")}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v))}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[15, 20, 25, 30, 45, 60].map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {t("settings.duration.minutes", { n: m })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-body-sm text-muted">
                    {t("settings.duration.hint", { n: duration })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <AvailabilityForm
              ref={availRef}
              onSave={handleSaveAvailability}
              initialDuration={duration}
              cabinetId={isManaged ? cabinetId : undefined}
              hideSaveButton
              onDirtyChange={setAvailDirty}
            />

            {/* Seuil Need Call */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-1 text-title-md text-ink">{t("settings.needCall.title")}</h3>
                <p className="mb-4 text-body-sm text-muted">{t("settings.needCall.subtitle")}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    type="number"
                    value={needDelay}
                    onChange={(e) => setNeedDelay(parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-24"
                  />
                  <Select value={needUnit} onValueChange={(v) => setNeedUnit(v as typeof needUnit)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">{t("settings.needCall.minutes")}</SelectItem>
                      <SelectItem value="hours">{t("settings.needCall.hours")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="mt-3 text-body-sm text-muted">
                  {t("settings.needCall.example", {
                    n: needDelay,
                    unit: t(
                      needUnit === "hours"
                        ? "settings.needCall.hourUnit"
                        : "settings.needCall.minuteUnit"
                    ),
                  })}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automatisation */}
        <TabsContent value="auto" className="focus-visible:ring-0 focus-visible:ring-offset-0">
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-2 text-title-md text-ink">{t("settings.channels.title")}</h3>
              <p className="mb-6 text-body-sm text-muted">{t("settings.channels.subtitle")}</p>
              <div className="flex flex-col gap-4">
                {([
                  ["whatsapp", "WhatsApp", "settings.channels.whatsappDesc"],
                  ["instagram", "Instagram", "settings.channels.instagramDesc"],
                  ["call", "settings.channels.callLabel", "settings.channels.callDesc", true],
                ] as const).map(([key, label, desc, proOnly]) => {
                  const labelText = label.includes(".") ? t(label as TKey) : label;
                  return (
                    <div
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-hairline p-4"
                    >
                      <div>
                        <p className="flex items-center gap-2 text-title-sm text-ink">
                          {labelText}
                          {proOnly ? (
                            <span className="rounded-full bg-avatar-emerald px-2 py-0.5 text-[10px] font-semibold text-ink">
                              Pro
                            </span>
                          ) : null}
                        </p>
                        <p className="text-body-sm text-muted">{t(desc)}</p>
                      </div>
                      <Switch
                        checked={channels[key]}
                        onCheckedChange={() => toggleChannel(key)}
                        aria-label={t("settings.channels.toggle", { label: labelText })}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Informations du cabinet */}
        <TabsContent value="infos" className="focus-visible:ring-0 focus-visible:ring-offset-0">
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-1 text-title-md text-ink">{t("settings.cabinet.title")}</h3>
                <p className="mb-6 text-body-sm text-muted">{t("settings.cabinet.subtitle")}</p>
                <div className="flex flex-col gap-5 sm:max-w-2xl">
                  <div>
                    <Label htmlFor="cabinet-name">{t("settings.cabinet.name")}</Label>
                    <Input id="cabinet-name" value={cabinetName} onChange={(e) => setCabinetName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="cabinet-agent">{t("settings.cabinet.agent")}</Label>
                    <Input id="cabinet-agent" value={cabinetAgent} onChange={(e) => setCabinetAgent(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="cabinet-location">{t("settings.cabinet.address")}</Label>
                    <Input id="cabinet-location" value={cabinetLocation} onChange={(e) => setCabinetLocation(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="cabinet-description">{t("settings.cabinet.description")}</Label>
                    <Input id="cabinet-description" value={cabinetDescription} onChange={(e) => setCabinetDescription(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="cabinet-maps">{t("settings.cabinet.mapsLink")}</Label>
                    <Input
                      id="cabinet-maps"
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={cabinetMapsLink}
                      onChange={(e) => setCabinetMapsLink(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    className="self-start"
                    onClick={handleSaveCabinet}
                    disabled={saving || !infosDirty}
                  >
                    {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    {t("common.save")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-2 text-title-md text-ink">{t("settings.plan.title")}</h3>
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface-soft px-5 py-4">
                  <div>
                    <p className="flex items-center gap-2 text-title-lg text-ink">
                      {displayCab?.plan?.toUpperCase() ?? "STANDARD"}
                      <span className="rounded-full bg-avatar-emerald px-2.5 py-1 text-[11px] font-semibold text-ink">
                        {t("settings.plan.active")}
                      </span>
                    </p>
                    <p className="text-body-sm text-muted">
                      {displayCab?.plan === "pro" ? "250 000 DA / an" : "150 000 DA / an"} · {t("settings.plan.renewal")}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm">
                    {t("settings.plan.change")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Google Agenda */}
        <TabsContent value="google" className="focus-visible:ring-0 focus-visible:ring-offset-0">
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-2 text-title-md text-ink">{t("settings.google.title")}</h3>
              <p className="mb-6 text-body-sm text-muted">{t("settings.google.subtitle")}</p>

              {googleStatus.connected ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-hairline p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="size-6 text-success" />
                      <div>
                        <p className="text-title-sm text-ink">
                          {t("settings.google.connected", { email: googleStatus.email || "" })}
                        </p>
                        <p className="text-body-sm text-muted">{t("settings.google.subtitle")}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={changeAccountConfirm} onOpenChange={setChangeAccountConfirm}>
                        <DialogTrigger asChild>
                          <Button variant="secondary" size="sm">
                            {t("settings.google.changeAccount")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("settings.google.warningTitle")}</DialogTitle>
                            <DialogDescription>
                              {t("settings.google.warningBody")}
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="secondary" onClick={() => setChangeAccountConfirm(false)}>
                              {t("common.cancel")}
                            </Button>
                            <Button variant="danger" onClick={handleChangeAccount}>
                              {t("settings.google.confirmChange")}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="danger" size="sm" onClick={handleDisconnectGoogle} disabled={googleLoading}>
                        {t("settings.google.disconnect")}
                      </Button>
                    </div>
                  </div>

                  <Button variant="primary" onClick={handleSyncGoogle} disabled={googleLoading} className="self-start">
                    {googleLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Synchroniser maintenant
                  </Button>
                </div>
              ) : (
                <Button variant="primary" onClick={handleConnectGoogle} disabled={googleLoading} className="self-start">
                  {googleLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  {t("settings.google.connectAccount")}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 w-64 rounded-lg" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      }
    >
      <SettingsPageInner />
    </React.Suspense>
  );
}
