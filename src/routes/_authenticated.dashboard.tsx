import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getPlan, PLAN_CREDITS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, Crown, Image as ImageIcon, Settings, Zap, History, FolderOpen, LifeBuoy, Ticket, HelpCircle, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Generation = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  status: string;
  created_at: string;
};

function Dashboard() {
  const { profile, user } = useAuth();
  const [gens, setGens] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("generations")
      .select("id, type, prompt, output_url, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data) setGens(data as Generation[]);
        setLoading(false);
      });
  }, [user]);

  if (!profile) return null;
  const plan = getPlan(profile.plan);
  const allocation = PLAN_CREDITS[profile.plan];
  const used = Math.max(0, allocation - profile.credits);
  const images = gens.filter((g) => g.type === "image").length;
  const videos = gens.filter((g) => g.type === "video").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profile.avatar_signed_url ?? undefined} alt={profile.display_name ?? "Avatar"} />
          <AvatarFallback>
            {(profile.display_name || profile.email || "U").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">Hi, {profile.display_name || "creator"} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's your account at a glance.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <Coins className="h-6 w-6 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Credits remaining</p>
          <p className="mt-1 text-3xl font-extrabold">{profile.credits}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Zap className="h-6 w-6 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Credits used</p>
          <p className="mt-1 text-3xl font-extrabold">{used}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Crown className="h-6 w-6 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Subscription</p>
          <p className="mt-1 text-3xl font-extrabold capitalize">{plan.name}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <ImageIcon className="h-6 w-6 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Generations</p>
          <p className="mt-1 text-base font-semibold">
            {images} image{images === 1 ? "" : "s"}
            {plan.video ? ` · ${videos} video${videos === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/editor">Open editor</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/history">
            <History className="mr-1.5 h-4 w-4" /> My workspace
          </Link>
        </Button>
        {profile.plan !== "studio" && (
          <Button asChild variant="outline">
            <Link to="/pricing">Upgrade plan</Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link to="/settings">
            <Settings className="mr-1.5 h-4 w-4" /> Settings
          </Link>
        </Button>
      </div>

      <section className="mt-10">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Support</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/tickets" className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary">
            <Ticket className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">My Tickets</p>
            <p className="mt-1 text-xs text-muted-foreground">View and track your tickets.</p>
          </Link>
          <Link to="/tickets" className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary">
            <Ticket className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">Open New Ticket</p>
            <p className="mt-1 text-xs text-muted-foreground">Report an issue or request help.</p>
          </Link>
          <Link to="/faq" className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary">
            <HelpCircle className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">FAQ</p>
            <p className="mt-1 text-xs text-muted-foreground">Find quick answers.</p>
          </Link>
          <Link to="/support" className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary">
            <Mail className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">Contact Support</p>
            <p className="mt-1 text-xs text-muted-foreground">Reach the support center.</p>
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Recent projects</h2>
          </div>
          <Link to="/history" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : gens.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
            <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No projects yet. Head to the editor to create your first one.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link to="/editor">Start creating</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {gens.map((g) => (
              <div key={g.id} className="overflow-hidden rounded-xl border border-border bg-card">
                {g.output_url ? (
                  <img
                    src={g.output_url}
                    alt={g.prompt ?? "Generated"}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-secondary">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="p-3">
                  <p className="truncate text-xs font-medium">{g.prompt ?? "Untitled"}</p>
                  <p className="mt-1 text-[11px] capitalize text-muted-foreground">
                    {g.type} · {new Date(g.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
