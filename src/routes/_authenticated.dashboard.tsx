import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Coins, Crown, Image as ImageIcon, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { profile } = useAuth();
  if (!profile) return null;
  const plan = getPlan(profile.plan);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold">Hi, {profile.display_name || "creator"} 👋</h1>
      <p className="mt-1 text-sm text-muted-foreground">Here's your account at a glance.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <Coins className="h-6 w-6 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Credits balance</p>
          <p className="mt-1 text-3xl font-extrabold">{profile.credits}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Crown className="h-6 w-6 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Current plan</p>
          <p className="mt-1 text-3xl font-extrabold capitalize">{plan.name}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <ImageIcon className="h-6 w-6 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Capabilities</p>
          <p className="mt-1 text-base font-semibold">
            Image{plan.video ? " + Video" : " only"}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/editor">Open editor</Link>
        </Button>
        {profile.plan === "free" && (
          <Button asChild variant="outline">
            <Link to="/pricing">Upgrade to Pro</Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link to="/settings">
            <Settings className="mr-1.5 h-4 w-4" /> Settings
          </Link>
        </Button>
      </div>
    </div>
  );
}
