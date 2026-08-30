// Admin control panel — user management, plan visibility, ad control,
// broadcasts. Rendered only inside /admin, which is itself gated both
// client-side and server-side (sole admin: firstaimrun89@gmail.com).

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PLAN_IDS,
  AD_TARGETS,
  AD_PLACEMENTS,
  BROADCAST_TARGETS,
  BROADCAST_KINDS,
  CREDIT_REASONS,
  DEFAULT_SETTINGS,
  getPublicSettings,
  saveAppSettings,
  listAdminUsers,
  adminAdjustCredits,
  adminChangePlan,
  adminSetBlocked,
  adminDeleteUser,
  adminUserHistory,
  sendBroadcast,
  listBroadcastsAdmin,
  setBroadcastActive,
  type AdminUser,
  type AppSettings,
  type ManagedPlanId,
} from "@/lib/admin-control.functions";
import { Users, SlidersHorizontal, Megaphone, Coins, Ban, Trash2, History } from "lucide-react";

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Users;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// ── Section 1: user management ──────────────────────────────────────────────

function UserManagement() {
  const qc = useQueryClient();
  const list = useServerFn(listAdminUsers);
  const adjust = useServerFn(adminAdjustCredits);
  const changePlan = useServerFn(adminChangePlan);
  const setBlocked = useServerFn(adminSetBlocked);
  const del = useServerFn(adminDeleteUser);
  const history = useServerFn(adminUserHistory);

  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });
  const [search, setSearch] = useState("");
  const [creditUser, setCreditUser] = useState<AdminUser | null>(null);
  const [amount, setAmount] = useState("100");
  const [reason, setReason] = useState<string>(CREDIT_REASONS[0]);
  const [historyUser, setHistoryUser] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: historyRows } = useQuery({
    queryKey: ["admin-user-history", historyUser?.id],
    queryFn: () => history({ data: { userId: historyUser!.id } }),
    enabled: !!historyUser,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const users = (data?.users ?? []).filter((u) => {
    const q = search.trim().toLowerCase();
    return !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
  });

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading users…</p>;

  return (
    <>
      <Input
        placeholder="Search by email or name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 max-w-sm"
      />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Credits</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2">Last active</th>
              <th className="px-3 py-2">Gens</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">
                  {u.email}
                  {u.blocked && <span className="ml-2 rounded bg-destructive/15 px-1.5 text-[10px] text-destructive">blocked</span>}
                </td>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">
                  <Select value={u.plan} onValueChange={(v) => run(() => changePlan({ data: { userId: u.id, plan: v as ManagedPlanId } }), "Plan updated.")}>
                    <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLAN_IDS.map((p) => (
                        <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2 font-semibold">{u.credits}</td>
                <td className="px-3 py-2">{new Date(u.joinedAt).toLocaleDateString()}</td>
                <td className="px-3 py-2">{u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-2">{u.generations}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => { setCreditUser(u); setAmount("100"); }}>
                      <Coins className="mr-1 h-3 w-3" /> Credits
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => setHistoryUser(u)}>
                      <History className="mr-1 h-3 w-3" /> History
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      disabled={busy}
                      onClick={() => run(() => setBlocked({ data: { userId: u.id, blocked: !u.blocked } }), u.blocked ? "User unblocked." : "User blocked.")}
                    >
                      <Ban className="mr-1 h-3 w-3" /> {u.blocked ? "Unblock" : "Block"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 px-2 text-[11px]"
                      disabled={busy}
                      onClick={() => {
                        if (!confirm(`Permanently delete ${u.email}? This cannot be undone.`)) return;
                        run(() => del({ data: { userId: u.id } }), "User deleted.");
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!creditUser} onOpenChange={(o) => !o && setCreditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add credits — {creditUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Amount (negative to remove)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREDIT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={busy}
              onClick={async () => {
                const n = parseInt(amount, 10);
                if (!Number.isFinite(n) || n === 0) return toast.error("Enter a non-zero amount.");
                await run(() => adjust({ data: { userId: creditUser!.id, amount: n, reason } }), "Credits updated.");
                setCreditUser(null);
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyUser} onOpenChange={(o) => !o && setHistoryUser(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Generations — {historyUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-xs">
            {(historyRows ?? []).map((h) => (
              <div key={h.id} className="rounded-lg border border-border p-2">
                <div className="flex justify-between">
                  <span className="font-semibold uppercase text-primary">{h.type}</span>
                  <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-muted-foreground">{h.prompt ?? "—"}</p>
              </div>
            ))}
            {!(historyRows ?? []).length && <p className="text-muted-foreground">No generations yet.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Sections 2 + 3: plan visibility and ad control ──────────────────────────

function SettingsControl() {
  const qc = useQueryClient();
  const load = useServerFn(getPublicSettings);
  const save = useServerFn(saveAppSettings);
  const { data } = useQuery({ queryKey: ["app-settings"], queryFn: () => load() });
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const settings = draft ?? data ?? DEFAULT_SETTINGS;

  const commit = async (next: AppSettings) => {
    setDraft(next);
    setBusy(true);
    try {
      await save({ data: next });
      qc.setQueryData(["app-settings"], next);
      toast.success("Ad settings saved.");
    } catch (err) {
      setDraft(data ?? null);
      toast.error(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">Plan visibility</h3>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">Hidden plans disappear from the pricing page.</p>
        {PLAN_IDS.map((p) => (
          <div key={p} className="flex items-center justify-between border-b border-border py-2">
            <span className="text-sm capitalize">{p} plan</span>
            <Switch
              checked={settings.planVisibility[p]}
              disabled={busy}
              onCheckedChange={(v) =>
                commit({ ...settings, planVisibility: { ...settings.planVisibility, [p]: v } })
              }
            />
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">Ad control</h3>
        <div className="mt-3 flex items-center justify-between border-b border-border py-2">
          <span className="text-sm">Ads enabled</span>
          <Switch
            checked={settings.ads.enabled}
            disabled={busy}
            onCheckedChange={(v) => commit({ ...settings, ads: { ...settings.ads, enabled: v } })}
          />
        </div>
        <div className="mt-3">
          <Label className="text-xs">Show ads to</Label>
          <Select
            value={settings.ads.target}
            onValueChange={(v) => commit({ ...settings, ads: { ...settings.ads, target: v as AppSettings["ads"]["target"] } })}
          >
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AD_TARGETS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All users" : t === "free" ? "Free users only" : t === "paid" ? "Paid users only" : "Nobody"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <h4 className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Placements</h4>
        {AD_PLACEMENTS.map((p) => (
          <div key={p} className="flex items-center justify-between border-b border-border py-2">
            <span className="text-sm capitalize">{p} page ads</span>
            <Switch
              checked={settings.ads.placements[p]}
              disabled={busy}
              onCheckedChange={(v) =>
                commit({ ...settings, ads: { ...settings.ads, placements: { ...settings.ads.placements, [p]: v } } })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 4: broadcast ────────────────────────────────────────────────────

function BroadcastControl() {
  const qc = useQueryClient();
  const send = useServerFn(sendBroadcast);
  const list = useServerFn(listBroadcastsAdmin);
  const toggle = useServerFn(setBroadcastActive);
  const { data: broadcasts } = useQuery({ queryKey: ["admin-broadcasts"], queryFn: () => list() });

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<string>("all");
  const [kind, setKind] = useState<string>("info");
  const [alsoEmail, setAlsoEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !message.trim()) return toast.error("Title and message are required.");
    setBusy(true);
    try {
      const res = await send({
        data: { title, message, target: target as never, kind: kind as never, alsoEmail },
      });
      toast.success(alsoEmail ? `Broadcast sent · ${res.emailed} emails delivered.` : "Broadcast published.");
      setTitle("");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send broadcast.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        <Textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={1500} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Target</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BROADCAST_TARGETS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BROADCAST_KINDS.map((k) => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <span className="text-sm">Also send by email</span>
          <Switch checked={alsoEmail} onCheckedChange={setAlsoEmail} />
        </div>
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy ? "Sending…" : "Send now"}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">Recent broadcasts</h3>
        {(broadcasts ?? []).map((b) => (
          <div key={b.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{b.title}</p>
                <p className="mt-0.5 text-[11px] uppercase text-muted-foreground">{b.kind} · {b.target} · {new Date(b.createdAt).toLocaleDateString()}</p>
              </div>
              <Switch
                checked={b.active}
                onCheckedChange={async (v) => {
                  await toggle({ data: { id: b.id, active: v } });
                  qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
                }}
              />
            </div>
          </div>
        ))}
        {!(broadcasts ?? []).length && <p className="text-xs text-muted-foreground">No broadcasts yet.</p>}
      </div>
    </div>
  );
}

export function AdminControlPanel() {
  return (
    <>
      <Section icon={Users} title="User management" subtitle="Credits, plans, blocking and account removal.">
        <UserManagement />
      </Section>
      <Section icon={SlidersHorizontal} title="Plan & ad control" subtitle="Choose which plans users see and where ads appear.">
        <SettingsControl />
      </Section>
      <Section icon={Megaphone} title="Broadcast message" subtitle="Publish an in-app notice, optionally emailed too.">
        <BroadcastControl />
      </Section>
    </>
  );
}
