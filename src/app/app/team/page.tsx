"use client";

import * as React from "react";
import { LockKeyhole, Plus, Trash2, Edit2 } from "lucide-react";

import { useApp } from "@/lib/app-context";
import { useToast } from "@/components/ui/toast";
import { avatarColor, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { TKey } from "@/lib/i18n";
import type { Role } from "@/lib/types";

const TABLE_HEADERS: TKey[] = [
  "team.member",
  "team.tableEmail",
  "team.role",
  "team.addedDate",
  "team.action",
];

function RoleBadge({ role }: { role: Role }) {
  const { t } = useApp();
  return (
    <Badge
      variant={role === "ADMIN" ? "default" : "secondary"}
      className={role === "ADMIN" ? "bg-brand-primary/10 text-brand-primary" : "bg-surface-card text-muted"}
    >
      {role === "ADMIN" ? t("role.admin") : t("role.secretary")}
    </Badge>
  );
}

export default function TeamPage() {
  const { role, switchRole, t, teamMembers, fetchTeam, deleteTeamMember, updateTeamMember, createTeamMember } = useApp();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<any | null>(null);

  React.useEffect(() => {
    fetchTeam().then(() => setLoading(false));
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [fetchTeam]);

  const removeMember = async (id: string, memberName: string) => {
    if (role !== "ADMIN") return;
    try {
      await deleteTeamMember(id);
      toast(t("team.removed", { name: memberName }), "danger");
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (member: any) => {
    setEditingMember(member);
    setName(member.username);
    setEmail(member.email);
    setOpen(true);
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    try {
      // Get cabinet_id from the first team member
      const cabinetId = teamMembers[0]?.cabinet_id || "";
      const newMember = await createTeamMember({
        role: "secretaire",
        email: email.trim(),
        username: name.trim(),
        phone: "",
        password: "",
      });
      toast(t("team.invited", { email: email.trim() }), "success");
      setName("");
      setEmail("");
      setOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      await updateTeamMember(editingMember.id, { role: editingMember.role, is_active: editingMember.is_active });
      toast(t("team.updated", { name: name.trim() }), "success");
      setEditingMember(null);
      setName("");
      setEmail("");
      setOpen(false);
    } catch (err) {
      console.error(err);
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

  if (role !== "ADMIN") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-hairline bg-canvas px-6 py-16 text-center shadow-card">
        <span className="flex size-16 items-center justify-center rounded-full bg-surface-card">
          <LockKeyhole className="size-8 text-muted" strokeWidth={1.5} />
        </span>
        <h2 className="text-title-md text-ink">{t("settings.restricted.title")}</h2>
        <p className="text-body-sm text-muted">
          {t("team.restricted.body")}
        </p>
        <Button variant="secondary" size="sm" onClick={switchRole}>
          {t("settings.restricted.viewAdmin")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-body-sm text-muted">
            {t("team.count", {
              n: teamMembers.length,
              m: teamMembers.filter((m) => m.role === "secretaire").length,
            })}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="primary" onClick={() => { setEditingMember(null); setName(""); setEmail(""); setOpen(true); }}>
              <Plus className="size-4" />
              {t("team.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMember ? t("team.editTitle") : t("team.invite")}</DialogTitle>
              <DialogDescription>{t("team.inviteDesc")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={editingMember ? handleUpdate : addMember} className="flex flex-col gap-4">
              <div>
                <label htmlFor="member-name" className="mb-1.5 block text-body-sm font-medium text-ink">
                  {t("team.fullName")}
                </label>
                <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("team.placeholderName")} required />
              </div>
              <div>
                <label htmlFor="member-email" className="mb-1.5 block text-body-sm font-medium text-ink">
                  {t("team.email")}
                </label>
                <Input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("team.placeholderEmail")} required />
              </div>
              <DialogFooter className="mt-2">
                <Button type="button" variant="secondary" onClick={() => { setOpen(false); setEditingMember(null); setName(""); setEmail(""); }}>
                  {t("team.cancel")}
                </Button>
                <Button type="submit">
                  {editingMember ? t("common.save") : t("team.sendInvite")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border border-hairline bg-canvas shadow-card">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-hairline">
                {TABLE_HEADERS.map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3 text-caption uppercase font-semibold text-muted">
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m) => (
                <tr key={m.id} className="h-16 border-b border-hairline transition-colors duration-150 last:border-0 hover:bg-surface-soft">
                  <td className="px-5 py-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-title-sm font-semibold text-white"
                        style={{ backgroundColor: avatarColor(m.username) }}
                      >
                        {initials(m.username)}
                      </span>
                      <div>
                        <p className="truncate text-title-sm text-ink">{m.username}</p>
                        <p className="truncate text-body-sm text-muted">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-2">{m.email}</td>
                  <td className="px-5 py-2">
                    <RoleBadge role={m.role === "admin" ? "ADMIN" : "SECRETARY"} />
                  </td>
                  <td className="px-5 py-2 text-muted">
                    {new Date(m.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-2">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(m)} aria-label={t("common.edit")}>
                        <Edit2 className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-danger" onClick={() => removeMember(m.id, m.username)} aria-label={t("common.remove")}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked cards */}
        <div className="flex flex-col gap-3 p-3 md:hidden">
          {teamMembers.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-hairline p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-title-sm font-semibold text-white"
                    style={{ backgroundColor: avatarColor(m.username) }}
                  >
                    {initials(m.username)}
                  </span>
                  <div>
                    <p className="text-title-sm text-ink">{m.username}</p>
                    <p className="text-body-sm text-muted">{m.email}</p>
                  </div>
                </div>
                <RoleBadge role={m.role === "admin" ? "ADMIN" : "SECRETARY"} />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleEdit(m)}>
                  {t("common.edit")}
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-danger" onClick={() => removeMember(m.id, m.username)}>
                  {t("common.remove")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}