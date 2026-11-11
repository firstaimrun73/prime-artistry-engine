import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminGate } from "@/components/admin/AdminGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminListFreeAccessApplications,
  adminReviewFreeAccessApplication,
} from "@/lib/free-access.functions";
import { COMPLIMENTARY_TOOL_OPTIONS, type ComplimentaryTool } from "@/lib/complimentary-access";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/free-access")({
  component: () => (
    <AdminGate>
      <AdminFreeAccessPage />
    </AdminGate>
  ),
});

type AppRow = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  reason: string;
  intended_use: string;
  tools_requested: string[];
  usage_frequency: string | null;
  extra_info: string | null;
  status: string;
  created_at: string;
};

function AdminFreeAccessPage() {
  const listFn = useServerFn(adminListFreeAccessApplications);
  const reviewFn = useServerFn(adminReviewFreeAccessApplication);
  const [rows, setRows] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AppRow | null>(null);
  const [note, setNote] = useState("");
  const [credits, setCredits] = useState("50");
  const [days, setDays] = useState("14");
  const [tools, setTools] = useState<ComplimentaryTool[]>(["maluto", "image"]);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await listFn();
      setRows((data as AppRow[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const review = async (decision: "approved" | "rejected") => {
    if (!selected) return;
    setBusy(true);
    try {
      await reviewFn({
        data: {
          applicationId: selected.id,
          decision,
          adminNote: note || undefined,
          creditsGranted: decision === "approved" ? Number(credits) || 0 : undefined,
          toolsGranted: decision === "approved" ? tools : undefined,
          expiresInDays: decision === "approved" ? Number(days) || 14 : undefined,
        },
      });
      toast.success(decision === "approved" ? "Approved and entitlements applied" : "Rejected");
      setSelected(null);
      setNote("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Free access requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manual review only. Approving grants credits + complimentary tool flags with an expiry. Submission never unlocks
        access.
      </p>

      {loading ? (
        <Loader2 className="mt-8 h-6 w-6 animate-spin text-primary" />
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left text-sm transition",
                  selected?.id === r.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40",
                )}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">{r.email}</span>
                  <span className="text-xs capitalize text-muted-foreground">{r.status}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.reason}</p>
              </button>
            ))}
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No applications yet.</p>}
          </div>

          {selected && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-bold">{selected.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground">{selected.email}</p>
              <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Reason</p>
              <p className="text-sm whitespace-pre-wrap">{selected.reason}</p>
              <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Intended use</p>
              <p className="text-sm whitespace-pre-wrap">{selected.intended_use}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Tools requested: {(selected.tools_requested || []).join(", ") || "—"}
                {selected.usage_frequency ? ` · ${selected.usage_frequency}` : ""}
              </p>
              {selected.extra_info && (
                <p className="mt-2 text-xs text-muted-foreground">Extra: {selected.extra_info}</p>
              )}

              {selected.status === "pending" && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <div>
                    <Label>Internal note</Label>
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Credits to grant</Label>
                      <Input value={credits} onChange={(e) => setCredits(e.target.value)} type="number" min={0} />
                    </div>
                    <div>
                      <Label>Expires in (days)</Label>
                      <Input value={days} onChange={(e) => setDays(e.target.value)} type="number" min={1} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {COMPLIMENTARY_TOOL_OPTIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setTools((prev) =>
                            prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                          )
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                          tools.includes(t.id)
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button disabled={busy} onClick={() => void review("approved")} className="flex-1">
                      Approve
                    </Button>
                    <Button disabled={busy} variant="outline" onClick={() => void review("rejected")} className="flex-1">
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
