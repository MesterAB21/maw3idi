"use client";

import * as React from "react";
import { useRouter, useSearchParams, notFound } from "next/navigation";
import {
  Building2,
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  Shield,
  Loader2,
  Settings2,
  TriangleAlert,
  MessageSquare,
  Phone,
  Wifi,
  Calendar,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-body-sm font-medium text-ink">
      {children}
    </label>
  );
}

interface CabinetRow {
  id: string;
  nom_cabinet: string;
  nom_agent: string;
  localisation: string;
  maps_link?: string | null;
  description?: string | null;
  slot_duration_minutes: number;
  need_call_threshold_minutes: number;
  plan: string;
  is_active: boolean;
  users_count?: number;
  channels_count?: number;
}

interface CabinetChannelRow {
  id: string;
  cabinet_id: string;
  cabinet_name: string;
  channel_type: string;
  channel_identifier: string;
  is_active: boolean;
  created_at: string;
}

interface UserRow {
  id: string;
  cabinet_id?: string | null;
  cabinet_name?: string | null;
  role: string;
  email: string;
  username: string;
  phone?: string | null;
  is_active: boolean;
  is_super_admin: boolean;
}

const NO_CABINET = "__none";
type Tab = "cabinets" | "users" | "dashboard";

function SuperAdminPageInner() {
  const { t, authUser, loading: authLoading } = useApp();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<Tab>(tabParam === "users" ? "users" : tabParam === "dashboard" ? "dashboard" : "cabinets");
  const [cabinets, setCabinets] = React.useState<CabinetRow[]>([]);
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [cabinetsLoading, setCabinetsLoading] = React.useState(false);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [cabinetSearch, setCabinetSearch] = React.useState("");
  const [userSearch, setUserSearch] = React.useState("");
  const [cabinetPage, setCabinetPage] = React.useState(1);
  const [userPage, setUserPage] = React.useState(1);
  const [cabinetTotal, setCabinetTotal] = React.useState(0);
  const [userTotal, setUserTotal] = React.useState(0);
  const [cabinetDialogOpen, setCabinetDialogOpen] = React.useState(false);
  const [userDialogOpen, setUserDialogOpen] = React.useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = React.useState(false);
  const [deleteCabinetTarget, setDeleteCabinetTarget] = React.useState<CabinetRow | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = React.useState<UserRow | null>(null);
  const [deleteChannelTarget, setDeleteChannelTarget] = React.useState<CabinetChannelRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [cabinetForm, setCabinetForm] = React.useState({
    nom_cabinet: "",
    nom_agent: "",
    localisation: "",
    maps_link: "",
    description: "",
    slot_duration_minutes: 30,
    need_call_threshold_minutes: 120,
    plan: "standard",
    is_active: true,
  });
  const [userForm, setUserForm] = React.useState({
    cabinet_id: NO_CABINET,
    role: "secretaire",
    email: "",
    username: "",
    phone: "",
    password: "",
    is_super_admin: false,
    is_active: true,
  });
  const [channelForm, setChannelForm] = React.useState({
    cabinet_id: "",
    channel_type: "whatsapp",
    channel_identifier: "",
    is_active: true,
  });
  const [editingUser, setEditingUser] = React.useState<UserRow | null>(null);
  const [editingChannel, setEditingChannel] = React.useState<CabinetChannelRow | null>(null);
  const [channels, setChannels] = React.useState<CabinetChannelRow[]>([]);
  const [channelsLoading, setChannelsLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const isSuperAdmin = authUser?.isSuperAdmin ?? false;
  const selfId = authUser?.id;

  const fetchCabinets = React.useCallback(async (page: number, search: string) => {
    setCabinetsLoading(true);
    try {
      const res = await api.listSuperAdminCabinets({ page, page_size: 20, search });
      setCabinets(res.data);
      setCabinetTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setCabinetsLoading(false);
    }
  }, []);

  const fetchChannels = React.useCallback(async (page: number, search: string, cabinetId?: string) => {
    setChannelsLoading(true);
    try {
      const res = await api.listSuperAdminCabinetChannels({ page, page_size: 20, search, cabinet_id: cabinetId });
      setChannels(res.data);
      return res;
    } catch (err) {
      console.error(err);
      setChannels([]);
      return { data: [], total: 0 };
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  const fetchUsers = React.useCallback(async (page: number, search: string) => {
    setUsersLoading(true);
    try {
      const res = await api.listSuperAdminUsers({ page, page_size: 20, search });
      setUsers(res.data);
      setUserTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  if (!authLoading && !isSuperAdmin) {
    notFound();
  }

  React.useEffect(() => {
    if (tabParam === "users" || tabParam === "cabinets" || tabParam === "dashboard") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) return;
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [authLoading, isSuperAdmin]);

  React.useEffect(() => {
    if (authLoading || !isSuperAdmin) return;
    fetchCabinets(cabinetPage, cabinetSearch);
  }, [authLoading, isSuperAdmin, cabinetSearch, cabinetPage, fetchCabinets]);

  React.useEffect(() => {
    if (authLoading || !isSuperAdmin) return;
    fetchUsers(userPage, userSearch);
  }, [authLoading, isSuperAdmin, userSearch, userPage, fetchUsers]);

  const resetCabinetForm = () => {
    setCabinetForm({
      nom_cabinet: "",
      nom_agent: "",
      localisation: "",
      maps_link: "",
      description: "",
      slot_duration_minutes: 30,
      need_call_threshold_minutes: 120,
      plan: "standard",
      is_active: true,
    });
  };

  const resetUserForm = () => {
    setEditingUser(null);
    setUserForm({
      cabinet_id: NO_CABINET,
      role: "secretaire",
      email: "",
      username: "",
      phone: "",
      password: "",
      is_super_admin: false,
      is_active: true,
    });
  };

  const handleSaveCabinet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nom_cabinet: cabinetForm.nom_cabinet,
        nom_agent: cabinetForm.nom_agent,
        localisation: cabinetForm.localisation,
        maps_link: cabinetForm.maps_link || null,
        description: cabinetForm.description || null,
        slot_duration_minutes: Number(cabinetForm.slot_duration_minutes),
        need_call_threshold_minutes: Number(cabinetForm.need_call_threshold_minutes),
        plan: cabinetForm.plan as "standard" | "pro",
        is_active: cabinetForm.is_active,
      };
      await api.createSuperAdminCabinet(payload);
      toast(t("superadmin.cabinet.created"), "success");
      setCabinetDialogOpen(false);
      resetCabinetForm();
      fetchCabinets(cabinetPage, cabinetSearch);
    } catch (err) {
      console.error(err);
      toast(t("superadmin.cabinet.saveError"), "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.is_super_admin && userForm.cabinet_id === NO_CABINET) {
      toast(t("superadmin.user.selectCabinet"), "danger");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        cabinet_id: userForm.cabinet_id === NO_CABINET ? null : userForm.cabinet_id,
        role: userForm.role,
        email: userForm.email,
        username: userForm.username,
        phone: userForm.phone || null,
        is_super_admin: userForm.is_super_admin,
        is_active: userForm.is_active,
      };
      if (userForm.password) body.password = userForm.password;
      if (editingUser) {
        const { email: _e, username: _u, ...rest } = body;
        await api.updateSuperAdminUser(editingUser.id, { ...rest, email: userForm.email, username: userForm.username });
        toast(t("superadmin.user.updated"), "success");
      } else {
        if (!userForm.password) {
          toast(t("superadmin.user.saveError"), "danger");
          setSaving(false);
          return;
        }
        await api.createSuperAdminUser(body);
        toast(t("superadmin.user.created"), "success");
      }
      setUserDialogOpen(false);
      resetUserForm();
      fetchUsers(userPage, userSearch);
    } catch (err) {
      console.error(err);
      toast(t("superadmin.user.saveError"), "danger");
    } finally {
      setSaving(false);
    }
  };

  const openEditUser = (user: UserRow) => {
    setEditingUser(user);
    setUserForm({
      cabinet_id: user.cabinet_id || NO_CABINET,
      role: user.role,
      email: user.email,
      username: user.username,
      phone: user.phone || "",
      password: "",
      is_super_admin: user.is_super_admin,
      is_active: user.is_active,
    });
    setUserDialogOpen(true);
  };

  const openDeleteCabinet = (cabinet: CabinetRow) => {
    setDeleteCabinetTarget(cabinet);
    setDeleteConfirmText("");
  };

  const openDeleteUser = (user: UserRow) => {
    setDeleteUserTarget(user);
    setDeleteConfirmText("");
  };

  const confirmDeleteCabinet = async () => {
    if (!deleteCabinetTarget) return;
    if (deleteConfirmText.trim() !== deleteCabinetTarget.nom_cabinet) return;
    setDeleting(true);
    try {
      await api.deleteSuperAdminCabinet(deleteCabinetTarget.id);
      toast(t("superadmin.cabinet.deleted"), "success");
      setDeleteCabinetTarget(null);
      fetchCabinets(cabinetPage, cabinetSearch);
    } catch (err) {
      console.error(err);
      toast(t("superadmin.cabinet.deleteError"), "danger");
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserTarget) return;
    const expected = deleteUserTarget.cabinet_name || deleteUserTarget.username;
    if (deleteConfirmText.trim() !== expected) return;
    setDeleting(true);
    try {
      await api.deleteSuperAdminUser(deleteUserTarget.id);
      toast(t("superadmin.user.deleted"), "success");
      setDeleteUserTarget(null);
      fetchUsers(userPage, userSearch);
    } catch (err) {
      console.error(err);
      toast(t("superadmin.user.deleteError"), "danger");
    } finally {
      setDeleting(false);
    }
  };

  const openChannelDialog = (cabinet: CabinetRow) => {
    setChannelForm({ cabinet_id: cabinet.id, channel_type: "whatsapp", channel_identifier: "", is_active: true });
    setEditingChannel(null);
    fetchChannels(1, "", cabinet.id);
    setChannelDialogOpen(true);
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const cabinetId = channelForm.cabinet_id;
    try {
      if (editingChannel) {
        await api.updateSuperAdminCabinetChannel(editingChannel.id, channelForm);
        toast("Canal mis à jour", "success");
      } else {
        await api.createSuperAdminCabinetChannel(channelForm);
        setCabinets((prev) =>
          prev.map((c) =>
            c.id === cabinetId ? { ...c, channels_count: (c.channels_count ?? 0) + 1 } : c
          )
        );
        toast("Canal créé", "success");
      }
      setChannelForm((prev) => ({ ...prev, channel_identifier: "" }));
      setEditingChannel(null);
      if (cabinetId) fetchChannels(1, "", cabinetId);
    } catch (err) {
      console.error(err);
      toast("Erreur lors de la sauvegarde", "danger");
    } finally {
      setSaving(false);
    }
  };

  const resetChannelForm = () => {
    setChannelForm({ cabinet_id: "", channel_type: "whatsapp", channel_identifier: "", is_active: true });
    setEditingChannel(null);
  };

  const openEditChannel = (channel: CabinetChannelRow) => {
    setEditingChannel(channel);
    setChannelForm({
      cabinet_id: channel.cabinet_id,
      channel_type: channel.channel_type,
      channel_identifier: channel.channel_identifier,
      is_active: channel.is_active,
    });
    setChannelDialogOpen(true);
  };

  const openDeleteChannel = (channel: CabinetChannelRow) => {
    setDeleteChannelTarget(channel);
    setDeleteConfirmText("");
  };

  const confirmDeleteChannel = async () => {
    if (!deleteChannelTarget) return;
    if (deleteConfirmText.trim() !== deleteChannelTarget.channel_identifier) return;
    setDeleting(true);
    try {
      const cabinetId = deleteChannelTarget.cabinet_id;
      await api.deleteSuperAdminCabinetChannel(deleteChannelTarget.id);
      toast("Canal supprimé", "success");
      setDeleteChannelTarget(null);
      setCabinets((prev) =>
        prev.map((c) =>
          c.id === cabinetId ? { ...c, channels_count: Math.max(0, (c.channels_count ?? 0) - 1) } : c
        )
      );
      if (cabinetId) fetchChannels(1, "", cabinetId);
    } catch (err) {
      console.error(err);
      toast("Erreur lors de la suppression", "danger");
    } finally {
      setDeleting(false);
    }
  };

  const toggleChannelActive = async (channel: CabinetChannelRow, value: boolean) => {
    try {
      await api.updateSuperAdminCabinetChannel(channel.id, { is_active: value });
      toast("Canal mis à jour", "success");
    } catch (err) {
      console.error(err);
      toast("Erreur lors de la mise à jour", "danger");
    }
  };

  const toggleCabinetActive = async (cabinet: CabinetRow, value: boolean) => {
    try {
      await api.updateSuperAdminCabinet(cabinet.id, { is_active: value });
      setCabinets((prev) => prev.map((c) => (c.id === cabinet.id ? { ...c, is_active: value } : c)));
      toast(t("superadmin.cabinet.updated"), "success");
    } catch (err) {
      console.error(err);
      toast(t("superadmin.cabinet.saveError"), "danger");
    }
  };

  const toggleUserSuperAdmin = async (user: UserRow, value: boolean) => {
    try {
      await api.updateSuperAdminUser(user.id, { is_super_admin: value });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_super_admin: value, cabinet_id: value ? u.cabinet_id : u.cabinet_id } : u))
      );
      fetchUsers(userPage, userSearch);
    } catch (err) {
      console.error(err);
      toast(t("superadmin.user.saveError"), "danger");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const cabinetPageCount = Math.max(1, Math.ceil(cabinetTotal / 20));
  const userPageCount = Math.max(1, Math.ceil(userTotal / 20));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-md font-bold text-ink">
            {t("superadmin.title")}
          </h1>
          <p className="mt-1 text-body-sm text-muted">{t("superadmin.subtitle")}</p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-medium text-brand-primary">
          <Shield className="size-3.5" />
          {t("superadmin.badge")}
        </span>
      </div>

      {activeTab === "cabinets" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={cabinetSearch}
                onChange={(e) => { setCabinetSearch(e.target.value); setCabinetPage(1); }}
                placeholder={t("superadmin.cabinet.searchPlaceholder")}
                className="h-10 rounded-full ps-9 pe-9"
              />
            </div>
            <Button onClick={() => { resetCabinetForm(); setCabinetDialogOpen(true); }}>
              <Plus className="size-4 mr-2" />
              {t("superadmin.cabinet.add")}
            </Button>
          </div>

          {cabinetsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : cabinets.length === 0 ? (
            <div className="rounded-xl border border-hairline bg-canvas p-12 text-center">
              <Building2 className="mx-auto mb-3 size-12 text-muted" />
              <p className="text-body-sm text-muted">{t("superadmin.cabinet.empty")}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-hairline bg-canvas overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline bg-surface-soft/40">
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.cabinet.name")}</th>
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.cabinet.agent")}</th>
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.cabinet.plan")}</th>
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.cabinet.users")}</th>
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.cabinet.channels")}</th>
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.cabinet.status")}</th>
                    <th className="px-4 py-3 text-right text-caption uppercase font-semibold text-muted">{t("common.actions")}</th>
                  </tr>
                </thead>
<tbody>
                  {cabinets.map((cabinet) => {
                    // Check if cabinet has admin user
                    const hasAdmin = users.some(u => u.cabinet_id === cabinet.id && u.role === "admin");
                    // Check if cabinet has channels (count only, fetched lazily on click)
                    const channelsCount = cabinet.channels_count ?? 0;
                    const hasChannels = channelsCount > 0;
                    // Show red warning if active but no admin or no channels
                    const hasWarning = cabinet.is_active && (!hasAdmin || !hasChannels);

                    return (
                      <tr key={cabinet.id} className="border-b border-hairline hover:bg-surface-soft/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{cabinet.nom_cabinet}</p>
                        <p className="text-body-sm text-muted">{cabinet.localisation}</p>
                      </td>
                      <td className="px-4 py-3">{cabinet.nom_agent}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-surface-card px-2.5 py-1 text-[12px] font-medium text-body">
                          {cabinet.plan.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">{cabinet.users_count ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="size-3.5 text-muted" />
                          <span className="font-medium text-ink">{channelsCount}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <Switch
                            checked={cabinet.is_active}
                            onCheckedChange={(v) => toggleCabinetActive(cabinet, v)}
                            aria-label={t("superadmin.cabinet.active")}
                          />
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium",
                            cabinet.is_active ? "bg-status-confirmed-bg text-status-confirmed" : "bg-status-cancelled-bg text-status-cancelled"
                          )}>
                            {cabinet.is_active ? t("superadmin.cabinet.active") : t("superadmin.cabinet.inactive")}
                          </span>
                          {hasWarning && (
                            <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-red-100 text-red-700 rounded-full" title={!hasAdmin ? "Aucun admin" : "Aucun canal"}>
                              <AlertTriangle className="size-3" />
                              {!hasAdmin && !hasChannels ? "Admin + Canaux" : !hasAdmin ? "Pas d'admin" : "Pas de canaux"}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => { openChannelDialog(cabinet); }}
                          >
                            <MessageSquare className="size-4 mr-1" />
                            Canaux
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push(`/app/settings?cabinet=${cabinet.id}`)}
                          >
                            <Settings2 className="size-4 mr-1" />
                            {t("superadmin.cabinet.manage")}
                          </Button>
                          <Button variant="ghost" size="icon" className="text-danger" onClick={() => openDeleteCabinet(cabinet)} aria-label={t("common.remove")}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          )}

          {cabinetTotal > 20 && (
            <div className="flex items-center justify-between">
              <p className="text-body-sm text-muted">
                {t("table.page", { n: cabinetPage, total: cabinetPageCount })}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setCabinetPage((p) => Math.max(1, p - 1))} disabled={cabinetPage === 1}>
                  PrÃ©cÃ©dent
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setCabinetPage((p) => Math.min(cabinetPageCount, p + 1))} disabled={cabinetPage === cabinetPageCount}>
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "dashboard" && (
        <SuperAdminDashboard cabinets={cabinets} />
      )}

      {activeTab === "users" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                placeholder={t("superadmin.user.searchPlaceholder")}
                className="h-10 rounded-full ps-9 pe-9"
              />
            </div>
            <Button onClick={() => { resetUserForm(); setUserDialogOpen(true); }}>
              <Plus className="size-4 mr-2" />
              {t("superadmin.user.add")}
            </Button>
          </div>

          {usersLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-hairline bg-canvas p-12 text-center">
              <Users className="mx-auto mb-3 size-12 text-muted" />
              <p className="text-body-sm text-muted">{t("superadmin.user.empty")}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-hairline bg-canvas overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline bg-surface-soft/40">
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.user.name")}</th>
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.user.email")}</th>
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.user.cabinet")}</th>
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.user.role")}</th>
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.user.superAdmin")}</th>
                    <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">{t("superadmin.user.status")}</th>
                    <th className="px-4 py-3 text-right text-caption uppercase font-semibold text-muted">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSelf = selfId !== undefined && user.id === selfId;
                    return (
                      <tr key={user.id} className="border-b border-hairline hover:bg-surface-soft/50">
                        <td className="px-4 py-3">{user.username}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3 text-muted">{user.cabinet_name || t("superadmin.user.noCabinet")}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-surface-card px-2.5 py-1 text-[12px] font-medium text-body">
                            {user.role === "admin" ? t("role.admin") : t("role.secretaire")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Switch
                            checked={user.is_super_admin}
                            onCheckedChange={(v) => toggleUserSuperAdmin(user, v)}
                            disabled={isSelf}
                            aria-label={t("superadmin.user.isSuperAdmin")}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium",
                            user.is_active ? "bg-status-confirmed-bg text-status-confirmed" : "bg-status-cancelled-bg text-status-cancelled"
                          )}>
                            {user.is_active ? t("superadmin.user.active") : t("superadmin.user.inactive")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditUser(user)} aria-label={t("common.edit")}>
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-danger"
                              onClick={() => openDeleteUser(user)}
                              aria-label={t("common.remove")}
                              disabled={isSelf}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {userTotal > 20 && (
            <div className="flex items-center justify-between">
              <p className="text-body-sm text-muted">
                {t("table.page", { n: userPage, total: userPageCount })}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage === 1}>
                  PrÃ©cÃ©dent
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setUserPage((p) => Math.min(userPageCount, p + 1))} disabled={userPage === userPageCount}>
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create cabinet dialog */}
      <Dialog open={cabinetDialogOpen} onOpenChange={setCabinetDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("superadmin.cabinet.addTitle")}</DialogTitle>
            <DialogDescription>{t("superadmin.cabinet.dialogSubtitle")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCabinet} className="flex flex-col gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cabinet-name">{t("superadmin.cabinet.name")}</Label>
                <Input id="cabinet-name" value={cabinetForm.nom_cabinet} onChange={e => setCabinetForm({...cabinetForm, nom_cabinet: e.target.value})} required />
              </div>
              <div>
                <Label htmlFor="cabinet-agent">{t("superadmin.cabinet.agent")}</Label>
                <Input id="cabinet-agent" value={cabinetForm.nom_agent} onChange={e => setCabinetForm({...cabinetForm, nom_agent: e.target.value})} required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cabinet-location">{t("superadmin.cabinet.location")}</Label>
                <Input id="cabinet-location" value={cabinetForm.localisation} onChange={e => setCabinetForm({...cabinetForm, localisation: e.target.value})} required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cabinet-maps">{t("superadmin.cabinet.mapsLink")}</Label>
                <Input id="cabinet-maps" type="url" placeholder="https://maps.google.com/..." value={cabinetForm.maps_link} onChange={e => setCabinetForm({...cabinetForm, maps_link: e.target.value})} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cabinet-description">{t("superadmin.cabinet.description")}</Label>
                <Input id="cabinet-description" value={cabinetForm.description} onChange={e => setCabinetForm({...cabinetForm, description: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="cabinet-duration">{t("superadmin.cabinet.duration")}</Label>
                <Input id="cabinet-duration" type="number" value={cabinetForm.slot_duration_minutes} onChange={e => setCabinetForm({...cabinetForm, slot_duration_minutes: parseInt(e.target.value) || 30})} min={5} max={120} />
              </div>
              <div>
                <Label htmlFor="cabinet-threshold">{t("superadmin.cabinet.threshold")}</Label>
                <Input id="cabinet-threshold" type="number" value={cabinetForm.need_call_threshold_minutes} onChange={e => setCabinetForm({...cabinetForm, need_call_threshold_minutes: parseInt(e.target.value) || 120})} min={1} />
              </div>
              <div>
                <Label htmlFor="cabinet-plan">{t("superadmin.cabinet.plan")}</Label>
                <Select value={cabinetForm.plan} onValueChange={v => setCabinetForm({...cabinetForm, plan: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">{t("superadmin.cabinet.planStandard")}</SelectItem>
                    <SelectItem value="pro">{t("superadmin.cabinet.planPro")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cabinet-active">{t("superadmin.cabinet.active")}</Label>
                <Switch id="cabinet-active" checked={cabinetForm.is_active} onCheckedChange={v => setCabinetForm({...cabinetForm, is_active: v})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCabinetDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create / edit user dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? t("superadmin.user.editTitle") : t("superadmin.user.addTitle")}</DialogTitle>
            <DialogDescription>{t("superadmin.user.dialogSubtitle")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUser} className="flex flex-col gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="user-cabinet">{t("superadmin.user.cabinet")}</Label>
                <Select value={userForm.cabinet_id} onValueChange={v => setUserForm({...userForm, cabinet_id: v})}>
                  <SelectTrigger><SelectValue placeholder={t("superadmin.user.selectCabinet")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CABINET}>{t("superadmin.user.noCabinet")}</SelectItem>
                    {cabinets.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom_cabinet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="user-role">{t("superadmin.user.role")}</Label>
                <Select value={userForm.role} onValueChange={v => setUserForm({...userForm, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t("role.admin")}</SelectItem>
                    <SelectItem value="secretaire">{t("role.secretaire")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="user-email">{t("superadmin.user.email")}</Label>
                <Input id="user-email" type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
              </div>
              <div>
                <Label htmlFor="user-username">{t("superadmin.user.username")}</Label>
                <Input id="user-username" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} required />
              </div>
              <div>
                <Label htmlFor="user-phone">{t("superadmin.user.phone")}</Label>
                <Input id="user-phone" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="user-password">{t("superadmin.user.password")} {editingUser ? t("superadmin.user.passwordOptional") : ""}</Label>
                <Input id="user-password" type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required={!editingUser} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="user-super" checked={userForm.is_super_admin} onCheckedChange={v => setUserForm({...userForm, is_super_admin: v})} />
                <Label htmlFor="user-super">{t("superadmin.user.isSuperAdmin")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="user-active" checked={userForm.is_active} onCheckedChange={v => setUserForm({...userForm, is_active: v})} />
                <Label htmlFor="user-active">{t("superadmin.user.active")}</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setUserDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create / edit cabinet channel dialog */}
      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingChannel ? "Modifier le canal" : "Ajouter un canal"}</DialogTitle>
            <DialogDescription>{editingChannel ? "Modifiez les informations du canal" : "Configurez un nouveau canal pour le cabinet"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveChannel} className="flex flex-col gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="channel-cabinet">Cabinet</Label>
                <Select value={channelForm.cabinet_id} onValueChange={v => setChannelForm({...channelForm, cabinet_id: v})} disabled={!!editingChannel}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un cabinet" /></SelectTrigger>
                  <SelectContent>
                    {cabinets.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom_cabinet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="channel-type">Type de canal</Label>
                <Select value={channelForm.channel_type} onValueChange={v => setChannelForm({...channelForm, channel_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="phone">Téléphone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="channel-identifier">Identifiant du canal</Label>
                <Input id="channel-identifier" placeholder="Numéro WhatsApp, ID Instagram, ou ligne GoIP" value={channelForm.channel_identifier} onChange={e => setChannelForm({...channelForm, channel_identifier: e.target.value})} required />
              </div>
              <div>
                <Label htmlFor="channel-active">Actif</Label>
                <Switch id="channel-active" checked={channelForm.is_active} onCheckedChange={v => setChannelForm({...channelForm, is_active: v})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setChannelDialogOpen(false); resetChannelForm(); }}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Enregistrer
              </Button>
            </div>
          </form>
          
          {/* Existing channels list */}
          {channelsLoading && channels.length === 0 ? (
            <div className="mt-6 flex items-center justify-center gap-2 border-t border-hairline pt-4 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" />
              Chargement des canaux...
            </div>
          ) : channels.length > 0 ? (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Canaux existants pour ce cabinet</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {channels.map((channel) => (
                  <div key={channel.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        channel.channel_type === "whatsapp" && "bg-green-100 text-green-700",
                        channel.channel_type === "instagram" && "bg-purple-100 text-purple-700",
                        channel.channel_type === "phone" && "bg-blue-100 text-blue-700"
                      )}>
                        {channel.channel_type}
                      </span>
                      <span className="font-mono text-sm font-medium text-gray-900">{channel.channel_identifier}</span>
                      <span className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full",
                        channel.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      )}>
                        {channel.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => openEditChannel(channel)}
                        disabled={channelsLoading}
                        aria-label="Modifier"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-800"
                        onClick={() => openDeleteChannel(channel)}
                        disabled={channelsLoading}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete cabinet (type-to-confirm) */}
      <Dialog open={Boolean(deleteCabinetTarget)} onOpenChange={(open) => { if (!open) setDeleteCabinetTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <TriangleAlert className="size-5" />
              {t("superadmin.cabinet.deleteTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("superadmin.cabinet.deleteConfirm")}
              {deleteCabinetTarget && (
                <span className="mt-2 block font-medium text-ink">
                  {t("superadmin.cabinet.deleteTypeConfirm", { name: deleteCabinetTarget.nom_cabinet })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={t("superadmin.cabinet.deletePlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteCabinetTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteCabinet}
              disabled={deleting || !deleteCabinetTarget || deleteConfirmText.trim() !== deleteCabinetTarget.nom_cabinet}
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {t("superadmin.cabinet.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user (type-to-confirm) */}
      <Dialog open={Boolean(deleteUserTarget)} onOpenChange={(open) => { if (!open) setDeleteUserTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <TriangleAlert className="size-5" />
              {t("superadmin.user.deleteTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("superadmin.user.deleteConfirm")}
              {deleteUserTarget && (
                <span className="mt-2 block font-medium text-ink">
                  {t("superadmin.user.deleteTypeConfirm", { name: deleteUserTarget.cabinet_name || deleteUserTarget.username })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={t("superadmin.user.deletePlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteUserTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteUser}
              disabled={deleting || !deleteUserTarget || deleteConfirmText.trim() !== (deleteUserTarget.cabinet_name || deleteUserTarget.username)}
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {t("superadmin.user.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete channel (type-to-confirm) */}
      <Dialog open={Boolean(deleteChannelTarget)} onOpenChange={(open) => { if (!open) setDeleteChannelTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <TriangleAlert className="size-5" />
              Supprimer le canal
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce canal ?
              {deleteChannelTarget && (
                <span className="mt-2 block font-medium text-ink">
                  Tapez "{deleteChannelTarget.channel_identifier}" pour confirmer
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Tapez l'identifiant du canal pour confirmer"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteChannelTarget(null)}>
              Annuler
</Button>
            <Button
              variant="danger"
              onClick={confirmDeleteChannel}
              disabled={deleting || !deleteChannelTarget || deleteConfirmText.trim() !== deleteChannelTarget.channel_identifier}
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Super Admin Dashboard Component
function DashboardStatCard({ label, value, subtitle, icon: Icon, color }: { label: string; value: number | string; subtitle: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    indigo: "bg-indigo-500",
    red: "bg-red-500",
  };
  return (
    <div className="rounded-xl bg-canvas px-5 py-4 shadow-card border border-hairline">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="text-2xl font-bold text-ink mt-1">{value}</p>
          <p className="text-xs text-muted mt-0.5">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color] || "bg-blue-500"}`}>
          <Icon className="size-5 text-white" />
        </div>
      </div>
    </div>
  );
}

interface ErrorRow {
  id: string;
  cabinet_id?: string | null;
  cabinet_name?: string | null;
  source: string;
  title: string;
  details?: string | null;
  proceeded: boolean;
  created_at: string;
}

function ErrorTable({
  title,
  source,
  selectedCabinet,
  refreshSignal,
}: {
  title: string;
  source: "agent" | "backend";
  selectedCabinet: string;
  refreshSignal: number;
}) {
  const { toast } = useToast();
  const [errors, setErrors] = React.useState<ErrorRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [showProceeded, setShowProceeded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const fetchErrors = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        source,
        page: 1,
        page_size: 20,
      };
      if (!showProceeded) (params as Record<string, boolean>).proceeded = false;
      if (selectedCabinet !== "all") (params as Record<string, string>).cabinet_id = selectedCabinet;
      const res = await api.listSuperAdminErrors(params as { source?: string; proceeded?: boolean; cabinet_id?: string; page?: number; page_size?: number });
      setErrors(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [source, selectedCabinet, showProceeded]);

  // Refresh auto toutes les 30s + a chaque changement de filtre
  React.useEffect(() => {
    fetchErrors();
    const timer = setInterval(fetchErrors, 30000);
    return () => clearInterval(timer);
  }, [fetchErrors, refreshSignal]);

  const handleProceed = async (id: string) => {
    try {
      await api.proceedSuperAdminError(id);
      toast("Erreur marquee traitee", "success");
      fetchErrors();
    } catch (err) {
      console.error(err);
      toast("Erreur lors du traitement", "danger");
    }
  };

  const fmtTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  return (
    <div className="rounded-xl border border-hairline bg-canvas">
      <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
        <h2 className="text-title-md font-semibold text-ink">{title}</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <Switch checked={showProceeded} onCheckedChange={setShowProceeded} />
            Afficher traitees ({total})
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-hairline bg-surface-soft/40">
              <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">Heure</th>
              <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">Cabinet</th>
              <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">Erreur</th>
              <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">Details</th>
              <th className="px-4 py-3 text-left text-caption uppercase font-semibold text-muted">Traite</th>
              <th className="px-4 py-3 text-right text-caption uppercase font-semibold text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">Chargement...</td></tr>
            ) : errors.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">Aucune erreur</td></tr>
            ) : (
              errors.map((e) => (
                <tr key={e.id} className="border-b border-hairline hover:bg-surface-soft/50">
                  <td className="px-4 py-3 whitespace-nowrap text-[13px]">{fmtTime(e.created_at)}</td>
                  <td className="px-4 py-3 text-[13px]">{e.cabinet_name || "â€”"}</td>
                  <td className="px-4 py-3 text-[13px] font-medium">{e.title}</td>
                  <td className="px-4 py-3 text-[13px] text-muted max-w-[280px] truncate" title={e.details || ""}>{e.details || "â€”"}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium",
                      e.proceeded ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {e.proceeded ? "Traite" : "Non traite"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!e.proceeded && (
                      <Button variant="secondary" size="sm" onClick={() => handleProceed(e.id)}>
                        Marquer traite
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuperAdminDashboard({ cabinets }: { cabinets: CabinetRow[] }) {
  const [selectedCabinet, setSelectedCabinet] = React.useState<string>("all");
  const [stats, setStats] = React.useState<Record<string, number> | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(false);
  const [refreshSignal, setRefreshSignal] = React.useState(0);

  const fetchStats = React.useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.getSuperAdminDashboardStats(selectedCabinet === "all" ? undefined : selectedCabinet);
      setStats(res);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedCabinet]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshSignal]);

  const statCards = [
    { label: "Cabinets", value: stats?.total_cabinets ?? "â€”", subtitle: `${stats?.active_cabinets ?? "â€”"} actifs`, icon: Building2, color: "blue" },
    { label: "Utilisateurs", value: stats?.total_users ?? "â€”", subtitle: `${stats?.admin_users ?? "â€”"} admins / ${stats?.secretary_users ?? "â€”"} secretaires`, icon: Users, color: "green" },
    { label: "Patients", value: stats?.total_patients ?? "â€”", subtitle: "Total uniques", icon: Users, color: "purple" },
    { label: "RDV Aujourd'hui", value: stats?.today_appointments ?? "â€”", subtitle: `${stats?.total_appointments ?? "â€”"} total`, icon: Calendar, color: "orange" },
    { label: "RDV Semaine", value: stats?.week_appointments ?? "â€”", subtitle: "7 jours", icon: Calendar, color: "blue" },
    { label: "RDV Mois", value: stats?.month_appointments ?? "â€”", subtitle: "30 jours", icon: Calendar, color: "indigo" },
    { label: "Erreurs Agent", value: stats?.agent ?? "â€”", subtitle: `${stats?.agent_unproceeded ?? "â€”"} non traitees`, icon: AlertTriangle, color: "red" },
    { label: "Erreurs Backend", value: stats?.backend ?? "â€”", subtitle: `${stats?.backend_unproceeded ?? "â€”"} non traitees`, icon: AlertTriangle, color: "red" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-md font-bold text-ink">Tableau de bord</h1>
          <p className="mt-1 text-body-sm text-muted">Statistiques globales et erreurs</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCabinet} onValueChange={setSelectedCabinet}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tous les cabinets" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les cabinets</SelectItem>
              {cabinets.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nom_cabinet}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" onClick={() => { fetchStats(); setRefreshSignal((k) => k + 1); }}>
            <RefreshCw className="size-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {statsLoading && !stats ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, index) => (
            <DashboardStatCard key={index} {...card} />
          ))}
        </div>
      )}

      <ErrorTable title="Erreurs Agent" source="agent" selectedCabinet={selectedCabinet} refreshSignal={refreshSignal} />

      <ErrorTable title="Erreurs Backend" source="backend" selectedCabinet={selectedCabinet} refreshSignal={refreshSignal} />
    </div>
  );
}
export default function SuperAdminPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 w-64 rounded-lg" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      }
    >
      <SuperAdminPageInner />
    </React.Suspense>
  );
}


