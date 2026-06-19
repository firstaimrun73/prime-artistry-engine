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
import { Mail, Paperclip } from "lucide-react";
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
  { id: "payment", label: "Billing" },
  { id: "technical", label: "Technical Issue" },
  { id: "account", label: "Account Issue" },
  { id: "feature_request", label: "Feature Request" },
  { id: "bug_report", label: "Bug Report" },
  { id: "other", label: "Other" },
] as const;

const PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Medium" },
  { id: "high", label: "High" },
  { id: "critical", label: "Critical" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_user: "Waiting for user",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-secondary text-secondary-foreground",
  in_progress: "bg-accent text-accent-foreground",
  waiting_user: "bg-accent text-accent-foreground",
  resolved: "bg-primary/15 text-primary",
  closed: "bg-muted text-muted-foreground",
};

type Ticket = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
};

const ticketSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  category: z.enum(["payment", "technical", "account", "feature_request", "bug_report", "other"]),
  priority: z.enum(["low", "normal", "high", "critical"]),
  subject: z.string().trim().min(3, "Subject is too short").max(120),
  message: z.string().trim().min(10, "Please describe the issue").max(2000),
});

function Support() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<string>("payment");
  const [priority, setPriority] = useState<string>("normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (profile?.display_name) setFullName(profile.display_name);
    if (profile?.email) setEmail(profile.email);
  }, [profile]);

  const loadTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("id, category, subject, message, status, priority, created_at")
      .order("created_at", { ascending: false });
    if (data) setTickets(data as Ticket[]);
  };

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const clearForm = () => {
    setFullName(profile?.display_name ?? "");
    setEmail(profile?.email ?? "");
    setCategory("payment");
    setPriority("normal");
    setSubject("");
    setMessage("");
    setFile(null);
  };

  const submit = async () => {
    if (!user) return;
    const parsed = ticketSchema.safeParse({ fullName, email, category, priority, subject, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);

    let attachment_url: string | null = null;
    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("ticket-attachments").upload(path, file);
      if (upErr) {
        setSubmitting(false);
        toast.error(`Attachment failed: ${upErr.message}`);
        return;
      }
      attachment_url = path;
    }

    const fullMessage = `From: ${parsed.data.fullName} <${parsed.data.email}>\n\n${parsed.data.message}`;
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        category: parsed.data.category,
        priority: parsed.data.priority,
        subject: parsed.data.subject,
        message: fullMessage,
        attachment_url,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const ticketNo = data?.id ? `#${data.id.slice(0, 8).toUpperCase()}` : "";
    toast.success(`Ticket ${ticketNo} submitted. We'll get back to you soon.`);
    clearForm();
    loadTickets();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Support Center</h1>
        <p className="mt-3 text-muted-foreground">Submit a ticket and track its status.</p>

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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" maxLength={120} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" maxLength={255} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" maxLength={120} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
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
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="message">Description</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5" rows={5} maxLength={2000} />
                </div>
                <div>
                  <Label htmlFor="attachment">Attachment (optional)</Label>
                  <label
                    htmlFor="attachment"
                    className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary"
                  >
                    <Paperclip className="h-4 w-4" />
                    {file ? file.name : "Choose a file…"}
                  </label>
                  <input
                    id="attachment"
                    type="file"
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={submit} disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit ticket"}
                  </Button>
                  <Button variant="outline" onClick={clearForm} disabled={submitting}>
                    Clear form
                  </Button>
                </div>
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
                        #{t.id.slice(0, 8).toUpperCase()} · {CATEGORIES.find((c) => c.id === t.category)?.label ?? t.category}
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{t.message}</p>
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
