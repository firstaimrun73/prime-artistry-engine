import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { getPlan } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "hi", label: "हिन्दी" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
];

const LANG_KEY = "motio2edit-language";
const NOTIF_KEY = "motio2edit-notifications";

type NotifPrefs = {
  product: boolean;
  marketing: boolean;
  security: boolean;
};

const DEFAULT_NOTIFS: NotifPrefs = { product: true, marketing: false, security: true };

function SettingsPage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [language, setLanguage] = useState("en");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [notifs, setNotifs] = useState<NotifPrefs>(DEFAULT_NOTIFS);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored) setLanguage(stored);
      const n = localStorage.getItem(NOTIF_KEY);
      if (n) setNotifs({ ...DEFAULT_NOTIFS, ...JSON.parse(n) });
    } catch {
      // ignore
    }
  }, []);

  if (!profile) return null;
  const plan = getPlan(profile.plan);

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
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwSaving(false);
    if (error) toast.error(error.message);
    else {
      setPw("");
      toast.success("Password changed.");
    }
  };

  const changeLanguage = (code: string) => {
    setLanguage(code);
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {
      // ignore
    }
    toast.success("Language preference saved.");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Profile</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="name">Username / display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Security</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input
              id="pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-1.5"
            />
          </div>
          <Button onClick={changePassword} disabled={pwSaving} variant="outline">
            {pwSaving ? "Updating…" : "Change password"}
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Appearance</h2>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Theme</span>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
            >
              <Sun className="mr-1.5 h-4 w-4" /> Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
            >
              <Moon className="mr-1.5 h-4 w-4" /> Dark
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Language</h2>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Preferred language</span>
          <Select value={language} onValueChange={changeLanguage}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Subscription &amp; billing</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current plan</span>
            <span className="font-medium capitalize">{plan.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Credits remaining</span>
            <span className="font-medium">{profile.credits}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Currency</span>
            <span className="font-medium">{profile.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Video generation</span>
            <span className="font-medium">{plan.video ? "Enabled" : "Disabled"}</span>
          </div>
        </div>
        {profile.plan !== "studio" && (
          <Button asChild className="mt-4">
            <Link to="/pricing">{profile.plan === "free" ? "Upgrade plan" : "Upgrade plan"}</Link>
          </Button>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Account</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleSignOut}>
            Log out
          </Button>
        </div>
      </section>
    </div>
  );
}
