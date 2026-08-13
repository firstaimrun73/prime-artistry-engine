import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getSubscriptionOverview,
  cancelSubscription,
  submitRefundRequest,
  type PaymentHistoryItem,
} from "@/lib/subscription.functions";
import { findPlan, type PlanId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CreditCard, ShieldCheck, Download, History, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile/subscription")({
  component: SubscriptionPage,
  head: () => ({
    meta: [
      { title: "Subscription & Billing — Motio2edit" },
      { name: "description", content: "Manage your Motio2edit plan, credits, cancellation and refund requests." },
      { property: "og:title", content: "Subscription & Billing — Motio2edit" },
      { property: "og:description", content: "Manage your Motio2edit plan, credits, cancellation and refund requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const REASON_OPTIONS = [
  { value: "technical_issue", label: "Technical issue" },
  { value: "duplicate_charge", label: "Duplicate charge" },
  { value: "not_as_expected", label: "Did not meet expectations" },
  { value: "accidental_purchase", label: "Accidentally purchased" },
  { value: "other", label: "Other" },
];

function fmtDate(v: string | null) {
  return v ? new Date(v).toLocaleString() : "—";
}

/** User-facing plan label; internal id "business" → Master Studio. */
function planLabel(id: string | null | undefined): string {
  if (!id || id === "custom") return id ?? "—";
  return findPlan(id as PlanId)?.name ?? id;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}

function downloadInvoice(item: PaymentHistoryItem, email: string | null) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${item.maskedTransactionId}</title>
  <style>body{font-family:Arial,sans-serif;max-width:720px;margin:40px auto;color:#111}
  .hd{background:#F97316;color:#fff;padding:20px;border-radius:8px}
  table{width:100%;border-collapse:collapse;margin-top:24px}
  td{padding:10px 8px;border-bottom:1px solid #eee}
  .total{font-size:20px;font-weight:800}</style></head><body>
  <div class="hd"><h1 style="margin:0">Motio2edit</h1><p style="margin:4px 0 0">by Motion2AI — Invoice</p></div>
  <table>
    <tr><td>Invoice number</td><td>INV-${item.id.slice(0, 8).toUpperCase()}</td></tr>
    <tr><td>Date</td><td>${new Date(item.createdAt).toLocaleString()}</td></tr>
    <tr><td>Billed to</td><td>${email ?? "—"}</td></tr>
    <tr><td>Plan</td><td>${planLabel(item.plan)} — ${item.credits} credits</td></tr>
    <tr><td>Payment method</td><td>${item.method}</td></tr>
    <tr><td>Transaction ID</td><td>${item.maskedTransactionId}</td></tr>
    <tr><td>Status</td><td>${item.status}</td></tr>
    <tr><td class="total">Amount paid</td><td class="total">${item.currency} ${item.amount.toFixed(2)}</td></tr>
  </table>
  <p style="margin-top:32px;font-size:12px;color:#666">Questions? Contact support@motio2edit.com</p>
  <script>window.onload=()=>window.print()<\/script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) {
    toast.error("Please allow pop-ups to download your invoice.");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function SubscriptionPage() {
  const overviewFn = useServerFn(getSubscriptionOverview);
  const cancelFn = useServerFn(cancelSubscription);
  const refundFn = useServerFn(submitRefundRequest);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["subscription-overview"],
    queryFn: () => overviewFn(),
  });

  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reason, setReason] = useState(REASON_OPTIONS[0].value);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your subscription…
      </div>
    );
  }

  const el = data.eligibility;

  const handleCancel = async () => {
    setBusy(true);
    try {
      const res = await cancelFn({ data: {} });
      toast.success(`Cancelled successfully. Your benefits stay active until ${new Date(res.expiresAt).toDateString()}.`);
      setCancelOpen(false);
      qc.invalidateQueries({ queryKey: ["subscription-overview"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not cancel your subscription.");
    } finally {
      setBusy(false);
    }
  };

  const handleRefund = async () => {
    setBusy(true);
    try {
      await refundFn({ data: { reason, details: details.trim() || undefined } });
      toast.success("Refund request submitted. We'll review within 2-3 business days.");
      setRefundOpen(false);
      setDetails("");
      qc.invalidateQueries({ queryKey: ["subscription-overview"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit your refund request.");
    } finally {
      setBusy(false);
    }
  };

  const latest = data.payments.find((p) => p.status === "completed") ?? data.payments[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-extrabold">Subscription & Billing</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your plan, invoices and refund requests.</p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Current plan</h2>
          <span
            className={`ml-auto rounded-full px-3 py-1 text-xs font-bold uppercase ${
              data.status === "active"
                ? "bg-emerald-500/15 text-emerald-600"
                : data.status === "cancelled"
                  ? "bg-amber-500/15 text-amber-600"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {data.status}
          </span>
        </div>

        <div className="mt-4">
          <Row label="Plan" value={planLabel(data.plan)} />
          <Row label="Purchase date" value={fmtDate(data.purchaseDate)} />
          <Row label="Next billing date" value={fmtDate(data.nextBillingDate)} />
          <Row label="Transaction ID" value={data.maskedTransactionId ?? "—"} />
          <Row label="Amount paid" value={data.purchaseDate ? `${data.currency} ${data.amount.toFixed(2)}` : "—"} />
          <Row label="Credits purchased" value={data.creditsPurchased.toLocaleString()} />
          <Row label="Credits used" value={data.creditsUsed.toLocaleString()} />
          <Row label="Credits remaining" value={data.creditsRemaining.toLocaleString()} />
          <Row label="Auto-renewal" value={data.autoRenew ? "ON" : "OFF"} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="btn-animate"
            disabled={data.status !== "active"}
            onClick={() => setCancelOpen(true)}
          >
            <XCircle className="mr-2 h-4 w-4" /> Cancel Subscription
          </Button>
          <Button className="btn-animate" disabled={!data.purchaseDate} onClick={() => setRefundOpen(true)}>
            Request Refund
          </Button>
          <Button
            variant="outline"
            className="btn-animate"
            disabled={!latest}
            onClick={() => latest && downloadInvoice(latest, null)}
          >
            <Download className="mr-2 h-4 w-4" /> Download Invoice
          </Button>
          <Button variant="outline" className="btn-animate" onClick={() => setHistoryOpen(true)}>
            <History className="mr-2 h-4 w-4" /> View Payment History
          </Button>
        </div>

        {el && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
            <p>{el.eligible ? "You are eligible for a full refund." : el.reason}</p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Payment history</h2>
        <PaymentTable items={data.payments} />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Need help?{" "}
        <Link to="/support" className="text-primary underline">
          Contact support
        </Link>
      </p>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel your subscription?</DialogTitle>
            <DialogDescription asChild>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-left text-sm">
                <li>You keep access until the billing period ends</li>
                <li>Auto-renewal will be disabled</li>
                <li>Your credits remain until expiry</li>
                <li>This action cannot be undone</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="destructive" onClick={handleCancel} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cancel Subscription
            </Button>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>
              Keep Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request a refund</DialogTitle>
            <DialogDescription>Review your purchase details and eligibility below.</DialogDescription>
          </DialogHeader>

          <div className="text-sm">
            <Row label="Original payment" value={`${data.currency} ${data.amount.toFixed(2)}`} />
            <Row label="Purchase date" value={fmtDate(data.purchaseDate)} />
            <Row label="Credits purchased" value={data.creditsPurchased.toLocaleString()} />
            <Row label="Credits used" value={data.creditsUsed.toLocaleString()} />
            <Row label="Credits remaining" value={data.creditsRemaining.toLocaleString()} />
            <Row
              label="Estimated refund"
              value={el?.eligible ? `${data.currency} ${data.amount.toFixed(2)}` : `${data.currency} 0.00`}
            />
          </div>

          <div
            className={`rounded-lg border p-3 text-sm ${
              el?.eligible ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"
            }`}
          >
            {el?.eligible
              ? "You are eligible for a full refund."
              : el?.reviewRequired
                ? `${el.reason} Your refund request will be reviewed by our team within 2-3 business days.`
                : (el?.reason ?? "You are not eligible for a refund.")}
          </div>

          {(el?.eligible || el?.reviewRequired) && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Reason</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {REASON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <Textarea
                placeholder="Anything else we should know? (optional)"
                value={details}
                maxLength={1000}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {el?.eligible || el?.reviewRequired ? (
              <Button onClick={handleRefund} disabled={busy || data.pendingRefund}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit Refund Request
              </Button>
            ) : (
              <Button asChild>
                <Link to="/support">Contact Support</Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => setRefundOpen(false)} disabled={busy}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment history</DialogTitle>
          </DialogHeader>
          <PaymentTable items={data.payments} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentTable({ items }: { items: PaymentHistoryItem[] }) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">No payments yet.</p>;
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2">Date</th>
            <th>Plan</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Transaction</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-t border-border/60">
              <td className="py-2">{new Date(p.createdAt).toLocaleString()}</td>
              <td>{planLabel(p.plan)}</td>
              <td>
                {p.currency} {p.amount.toFixed(2)}
              </td>
              <td className="capitalize">{p.method}</td>
              <td>{p.maskedTransactionId}</td>
              <td className="capitalize">{p.status}</td>
              <td>
                <Button size="sm" variant="ghost" onClick={() => downloadInvoice(p, null)}>
                  <Download className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
