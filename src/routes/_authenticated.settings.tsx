import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getPlan } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);

  if (!profile) return null;
  const plan = getPlan(profile.plan);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      await refreshProfile();
      toast.success("Saved.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Account details</h2>
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
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Billing & plan</h2>
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
            <Link to="/pricing">{profile.plan === "free" ? "Upgrade plan" : "Upgrade to Studio"}</Link>
          </Button>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Session</h2>
        <Button variant="outline" className="mt-4" onClick={() => signOut()}>
          Sign out
        </Button>
      </section>
    </div>
  );
}
