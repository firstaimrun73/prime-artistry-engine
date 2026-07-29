import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listRefundRequests, approveRefund, rejectRefund, type AdminRefundRow } from "@/lib/admin-refunds.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin_/refunds")({
  component: AdminRefundsPage,
  head: () => ({
    meta: [
      { title: "Refund Requests — MOTIO2EDIT Admin" },
      { name: "description", content: "Review, approve or reject MOTIO2EDIT refund requests." },
      { property: "og:title", content: "Refund Requests — MOTIO2EDIT Admin" },
      { property: "og:description", content: "Review, approve or reject MOTIO2EDIT refund requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminRefundsPage() {
  const listFn = useServerFn(listRefundRequests);
  const approveFn = useServerFn(approveRefund);
  const rejectFn = useServerFn(rejectRefund);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["admin-refunds"], queryFn: () => listFn() });
  const [approving, setApproving] = useState<AdminRefundRow | null>(null);
  const [rejecting, setRejecting] = useState<AdminRefundRow | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">Loading refund requests…</div>;
  }

  if (!data?.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page is restricted.</p>
      </div>
    );
  }

  const doApprove = async () => {
    if (!approving) return;
    setBusy(true);
    try {
      await approveFn({ data: { requestId: approving.id, note: note.trim() || undefined } });
      toast.success("Refund approved and issued.");
      setApproving(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-refunds"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Refund failed.");
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!rejecting) return;
    if (note.trim().length < 3) {
      toast.error("Please write a rejection reason.");
      return;
    }
    setBusy(true);
    try {
      await rejectFn({ data: { requestId: rejecting.id, note: note.trim() } });
      toast.success("Request rejected and the user has been notified.");
      setRejecting(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-refunds"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not reject the request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to admin
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold">Refund requests</h1>

      {data.rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No refund requests yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">User</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Purchased</th>
                <th>Credits</th>
                <th>Reason</th>
                <th>Requested</th>
                <th>Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60 align-top">
                  <td className="p-3">
                    <div className="font-semibold">{r.userName}</div>
                    <div className="text-xs text-muted-foreground">{r.userEmail}</div>
                    <div className="text-xs text-muted-foreground">{r.maskedTransactionId}</div>
                  </td>
                  <td className="uppercase">{r.plan}</td>
                  <td>
                    {r.currency} {r.amount.toFixed(2)}
                  </td>
                  <td>{r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString() : "—"}</td>
                  <td>
                    {r.creditsUsed} / {r.creditsPurchased}
                  </td>
                  <td className="max-w-[200px]">
                    <div className="capitalize">{r.reason.replace(/_/g, " ")}</div>
                    {r.details && <div className="text-xs text-muted-foreground">{r.details}</div>}
                  </td>
                  <td>{new Date(r.requestedAt).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${
                        r.status === "pending"
                          ? "bg-amber-500/15 text-amber-600"
                          : r.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.adminNote && <div className="mt-1 text-xs text-muted-foreground">{r.adminNote}</div>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => { setApproving(r); setNote(""); }}>
                            Approve Refund
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejecting(r); setNote(""); }}>
                            Reject
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`mailto:${r.userEmail}`}>Contact User</a>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Refund {approving?.currency} {approving?.amount.toFixed(2)} to {approving?.userEmail}?
            </DialogTitle>
            <DialogDescription>
              This calls PayPal immediately and cannot be undone. The user will be emailed automatically.
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Optional note to the user" value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button onClick={doApprove} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Refund
            </Button>
            <Button variant="outline" onClick={() => setApproving(null)} disabled={busy}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject refund request</DialogTitle>
            <DialogDescription>The reason below is emailed to the user.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Rejection reason" value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="destructive" onClick={doReject} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reject & Notify
            </Button>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={busy}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
