import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { getPlan } from "@/lib/plans";
import { getTier } from "@/lib/plan-tier";
import { CrownBadge } from "@/components/CrownBadge";
import { GoogleLanguageSelect } from "@/components/TranslateWidget";
import { Lock } from "lucide-react";
import { isAdminEmail } from "@/lib/admin-config";
import { useI18n } from "@/lib/i18n";
import { AVATAR_PRESETS } from "@/lib/avatar-presets";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

import {
  loadHistoryPrefs,
  saveHistoryPrefs,
  type HistoryPrefs,
  DEFAULT_HISTORY_PREFS,
} from "@/lib/history-retention";

const NOTIF_KEY = "motio2edit-notifications";

type NotifPrefs = {
  product: boolean;
  marketing: boolean;
  security: boolean;
};

const DEFAULT_NOTIFS: NotifPrefs = { product: true, marketing: false, security: true };

function SettingsPage() {
  const { profile, user, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [notifs, setNotifs] = useState<NotifPrefs>(DEFAULT_NOTIFS);
  const [historyPrefs, setHistoryPrefs] = useState<HistoryPrefs>(DEFAULT_HISTORY_PREFS);
  const [historySaving, setHistorySaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const n = localStorage.getItem(NOTIF_KEY);
      if (n) setNotifs({ ...DEFAULT_NOTIFS, ...JSON.parse(n) });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    loadHistoryPrefs(user.id).then((prefs) => {
      if (!cancelled) setHistoryPrefs(prefs);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!profile) return null;
  const plan = getPlan(profile.plan);
  const tier = getTier(profile.plan);
  const canUploadAvatar = tier.canUploadAvatar;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      await refreshProfile();
      toast.success("Profile updated.");
    }
  };

  const changePassword = async () => {
    if (!currentPw) {
      toast.error("Enter your current password to continue.");
      return;
    }
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (!user?.email) {
      toast.error("No email on this account.");
      return;
    }
    setPwSaving(true);
    try {
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (reauthErr) {
        toast.error("Current password is incorrect.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        toast.error(error.message);
        return;
      }
      setPw("");
      setCurrentPw("");
      toast.success("Password changed.");
    } finally {
      setPwSaving(false);
    }
  };

  const pickPreset = async (id: string) => {
    setAvatarBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: `preset:${id}` })
      .eq("id", profile.id);
    setAvatarBusy(false);
    if (error) toast.error(error.message);
    else {
      await refreshProfile();
      toast.success("Avatar updated.");
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!canUploadAvatar) {
      toast.error("Upgrade to Starter or above to upload a custom photo.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }
    setAvatarBusy(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      setAvatarBusy(false);
      toast.error(upErr.message);
      return;
    }
    const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", profile.id);
    setAvatarBusy(false);
    if (error) toast.error(error.message);
    else {
      await refreshProfile();
      toast.success("Profile picture updated.");
    }
  };

  const toggleNotif = (key: keyof NotifPrefs, value: boolean) => {
    const next = { ...notifs, [key]: value };
    setNotifs(next);
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const toggleHistoryPref = async (key: keyof HistoryPrefs, value: boolean) => {
    const next = { ...historyPrefs, [key]: value };
    setHistoryPrefs(next);
    if (!user?.id) return;
    setHistorySaving(true);
    await saveHistoryPrefs(user.id, next);
    setHistorySaving(false);
    toast.success("History preference saved.");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 pb-24 md:pb-12">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <CrownBadge plan={profile.plan} showLabel size="md" />
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Avatar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick a cartoon animal or upload a photo (paid).</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {AVATAR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={avatarBusy}
              onClick={() => pickPreset(p.id)}
              className="h-12 w-12 overflow-hidden rounded-full border border-border hover:ring-2 hover:ring-primary"
              title={p.label}
            >
              <img src={p.src} alt={p.label} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        {canUploadAvatar && (
          <div className="mt-3">
            <Button size="sm" variant="outline" disabled={avatarBusy} onClick={() => fileRef.current?.click()}>
              Upload photo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">{t("settings.profile")}</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? t("common.loading") : t("settings.save")}
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">{t("settings.security")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your current password, then a new password (min 8 characters).
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="current-pw">Current password</Label>
            <Input
              id="current-pw"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="mt-1.5"
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input
              id="pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1.5"
              autoComplete="new-password"
            />
          </div>
          <Button onClick={changePassword} disabled={pwSaving} variant="outline">
            {pwSaving ? t("common.loading") : "Change password"}
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">{t("settings.appearance")}</h2>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("settings.theme")}</span>
          <div className="flex gap-2">
            <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
              <Sun className="mr-1.5 h-4 w-4" /> {t("settings.light")}
            </Button>
            <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
              <Moon className="mr-1.5 h-4 w-4" /> {t("settings.dark")}
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Language</h2>
        <p className="mt-1 text-sm text-muted-foreground">Interface language (saved for this device).</p>
        <div className="mt-4">
          <GoogleLanguageSelect />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">History</h2>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Save my history</p>
            <p className="text-xs text-muted-foreground">When off, new generations are not stored.</p>
          </div>
          <Switch
            checked={historyPrefs.history_enabled}
            disabled={historySaving}
            onCheckedChange={(v) => toggleHistoryPref("history_enabled", v)}
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">{t("settings.notifications")}</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">Product updates</p>
            <Switch checked={notifs.product} onCheckedChange={(v) => toggleNotif("product", v)} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">Marketing & offers</p>
            <Switch checked={notifs.marketing} onCheckedChange={(v) => toggleNotif("marketing", v)} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">Security alerts</p>
            <Switch checked={notifs.security} onCheckedChange={(v) => toggleNotif("security", v)} />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Plan</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Current</span>
            <span className="font-medium">{plan.name}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Credits</span>
            <span className="font-medium">{isAdminEmail(profile.email) ? "∞" : profile.credits}</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/pricing">View pricing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/tickets">Report a bug</Link>
          </Button>
        </div>
      </section>

      {/* Logout only on Profile dashboard — intentionally omitted here */}
    </div>
  );
}
