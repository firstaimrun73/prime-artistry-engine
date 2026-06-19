import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — MOTIO2EDIT" },
      { name: "description", content: "Get help with payments, credits, AI generation, and account issues. Submit a ticket and track its status." },
      { property: "og:title", content: "Support — MOTIO2EDIT" },
      { property: "og:description", content: "Submit a support ticket and track its status." },
    ],
  }),
  component: Support,
});

const CATEGORIES = [
  { id: "payment", label: "Payment issues" },
  { id: "credits", label: "Credit issues" },
  { id: "generation", label: "AI generation issues" },
  { id: "account", label: "Account issues" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-secondary text-secondary-foreground",
  in_progress: "bg-accent text-accent-foreground",
  resolved: "bg-primary/15 text-primary",
};

type Ticket = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

const ticketSchema = z.object({
  category: z.enum(["payment", "credits", "generation", "account"]),
  subject: z.string().trim().min(3, "Subject is too short").max(120),
  message: z.string().trim().min(10, "Please describe the issue").max(2000),
});

function Support() {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>("payment");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const loadTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("id, category, subject, message, status, created_at")
      .order("created_at", { ascending: false });
    if (data) setTickets(data as Ticket[]);
  };

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async () => {
    if (!user) return;
    const parsed = ticketSchema.safeParse({ category, subject, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      category: parsed.data.category,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ticket submitted.");
    setSubject("");
    setMessage("");
    loadTickets();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Support</h1>
        <p className="mt-3 text-muted-foreground">Submit a ticket and we'll get back to you.</p>

        {!user ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Sign in to submit and track support tickets.</p>
            <Button asChild className="mt-4">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <section className="mt-10 rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold">Submit a ticket</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" maxLength={120} />
                </div>
                <div>
                  <Label htmlFor="message">Describe the issue</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5" rows={5} maxLength={2000} />
                </div>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit ticket"}
                </Button>
              </div>
            </section>

            <section className="mt-6">
              <h2 className="font-semibold">Your tickets</h2>
              {tickets.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No tickets yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {tickets.map((t) => (
                    <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{t.subject}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[t.status] ?? ""}`}>
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                        {CATEGORIES.find((c) => c.id === t.category)?.label ?? t.category}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">{t.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <section className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <Mail className="h-4 w-4 text-primary" /> Email support
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Prefer email? Reach us at{" "}
            <a href="mailto:support@motio2edit.com" className="text-primary hover:underline">support@motio2edit.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
