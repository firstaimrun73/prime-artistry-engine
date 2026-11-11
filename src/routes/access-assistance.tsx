import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  listMyFreeAccessApplications,
  submitFreeAccessApplication,
} from "@/lib/free-access.functions";
import { COMPLIMENTARY_TOOL_OPTIONS, type ComplimentaryTool } from "@/lib/complimentary-access";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/access-assistance")({
  head: () => ({
    meta: [
      { title: "Access Assistance — Motio2edit" },
      {
        name: "description",
        content: "Request limited complimentary AI access. Applications are reviewed individually.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: AccessAssistancePage,
});

const FREQ = ["Occasionally", "A few times a week", "Daily", "Project-based"] as const;

function AccessAssistancePage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const submit = useServerFn(submitFreeAccessApplication);
  const listMine = useServerFn(listMyFreeAccessApplications);

  const [fullName, setFullName] = useState("");
  const [reason, setReason] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [tools, setTools] = useState<ComplimentaryTool[]>(["maluto", "image"]);
  const [freq, setFreq] = useState<string>("Occasionally");
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [apps, setApps] = useState<
    {
      id: string;
      status: string;
      credits_granted: number | null;
      tools_granted: string[] | null;
      expires_at: string | null;
      created_at: string;
      admin_note: string | null;
    }[]
  >([]);

  useEffect(() => {
    if (profile?.display_name) setFullName(profile.display_name);
  }, [profile?.display_name]);

  useEffect(() => {
    if (!user) return;
    void listMine()
      .then((rows) => setApps((rows as typeof apps) ?? []))
      .catch(() => {});
  }, [user, listMine]);

  const toggleTool = (id: ComplimentaryTool) => {
    setTools((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      void navigate({ to: "/auth", search: { redirect: "/access-assistance", mode: "signin" } });
      return;
    }
    if (tools.length === 0) {
      toast.error("Select at least one AI tool");
      return;
    }
    setBusy(true);
    try {
      await submit({
        data: {
          fullName: fullName || undefined,
          reason,
          intendedUse,
          toolsRequested: tools,
          usageFrequency: freq,
          extraInfo: extra || undefined,
        },
      });
      toast.success("Request submitted — we'll review it individually.");
      setReason("");
      setIntendedUse("");
      setExtra("");
      const rows = await listMine();
      setApps((rows as typeof apps) ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10 pb-24 sm:py-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Access assistance</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          AI access should be within everyone's reach
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Can't afford a subscription? Share what you want to create. Requests are reviewed by our team —
          approval is never automatic, and access is limited when granted.
        </p>

        {apps.length > 0 && (
          <div className="mt-6 space-y-2">
            <h2 className="text-sm font-semibold">Your applications</h2>
            {apps.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium capitalize">{a.status.replace("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
                {a.status === "approved" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Credits granted: {a.credits_granted ?? 0}
                    {a.tools_granted?.length ? ` · Tools: ${a.tools_granted.join(", ")}` : ""}
                    {a.expires_at ? ` · Expires ${new Date(a.expires_at).toLocaleDateString()}` : ""}
                  </p>
                )}
                {a.status === "rejected" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    We couldn't approve this request. You're welcome to explore{" "}
                    <Link to="/pricing" className="font-medium text-primary hover:underline">
                      pricing plans
                    </Link>
                    .
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {!user ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Sign in to submit a free access request.</p>
            <Button asChild className="mt-4">
              <Link to="/auth" search={{ redirect: "/access-assistance", mode: "signin" }}>
                Sign in
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div>
              <Label htmlFor="email">Account email</Label>
              <Input id="email" value={profile?.email ?? user.email ?? ""} disabled className="mt-1" />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1"
                maxLength={120}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="reason">Why you need free access</Label>
              <Textarea
                id="reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 min-h-[90px]"
                maxLength={1500}
                placeholder="Briefly explain your situation (min. 20 characters)"
              />
            </div>
            <div>
              <Label htmlFor="use">What you intend to create</Label>
              <Textarea
                id="use"
                required
                value={intendedUse}
                onChange={(e) => setIntendedUse(e.target.value)}
                className="mt-1 min-h-[90px]"
                maxLength={1500}
                placeholder="Projects, learning goals, community work…"
              />
            </div>
            <div>
              <Label>AI tools of interest</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMPLIMENTARY_TOOL_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTool(t.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      tools.includes(t.id)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Expected usage</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {FREQ.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFreq(f)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      freq === f ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="extra">Additional information (optional)</Label>
              <Textarea
                id="extra"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                className="mt-1"
                maxLength={1500}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Submitting does not unlock features. We review each request and may grant limited credits and tools for
              a set period.
            </p>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit free access request"
              )}
            </Button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
