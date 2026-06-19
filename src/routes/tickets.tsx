import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
import { Paperclip, Image as ImageIcon } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "Support Tickets — MOTIO2EDIT" },
      { name: "description", content: "Create support tickets, set priority, attach screenshots, and track ticket status and history." },
      { property: "og:title", content: "Support Tickets — MOTIO2EDIT" },
      { property: "og:description", content: "Create and track support tickets with priority and screenshot uploads." },
    ],
  }),
  component: Tickets,
});

const CATEGORIES = [
  { id: "payment", label: "Payment issues" },
  { id: "credits", label: "Credit issues" },
  { id: "generation", label: "AI generation issues" },
  { id: "account", label: "Account issues" },
] as const;

const PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
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

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-secondary text-muted-foreground",
  normal: "bg-secondary text-secondary-foreground",
  high: "bg-accent text-accent-foreground",
  urgent: "bg-primary/15 text-primary",
};

type Ticket = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  attachment_url: string | null;
  created_at: string;
};

const ticketSchema = z.object({
  category: z.enum(["payment", "credits", "generation", "account"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  subject: z.string().trim().min(3, "Subject is too short").max(120),
  message: z.string().trim().min(10, "Please describe the issue").max(2000),
});

function Tickets() {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>("payment");
  const [priority, setPriority] = useState<string>("normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("id, category, subject, message, status, priority, attachment_url, created_at")
      .order("created_at", { ascending: false });
    if (data) setTickets(data as Ticket[]);
  };

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async () => {
    if (!user) return;
    const parsed = ticketSchema.safeParse({ category, priority, subject, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);

    let attachment_url: string | null = null;
    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("ticket-attachments")
        .upload(path, file);
      if (upErr) {
        setSubmitting(false);
        toast.error(`Upload failed: ${upErr.message}`);
        return;
      }
      attachment_url = path;
    }

    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      category: parsed.data.category,
      priority: parsed.data.priority,
      subject: parsed.data.subject,
      message: parsed.data.message,
      attachment_url,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ticket created.");
    setSubject("");
    setMessage("");
    setPriority("normal");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    loadTickets();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Support tickets</h1>
        <p className="mt-3 text-muted-foreground">
          Create a ticket, set its priority, attach a screenshot, and track its status.
        </p>

        {!user ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Sign in to create and track tickets.</p>
            <Button asChild className="mt-4">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <section className="mt-10 rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold">Create support ticket</h2>
              <div className="mt-4 space-y-4">
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
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" maxLength={120} />
                </div>
                <div>
                  <Label htmlFor="message">Describe the issue</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5" rows={5} maxLength={2000} />
                </div>
                <div>
                  <Label htmlFor="attachment">Screenshot / file (optional)</Label>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Input
                      id="attachment"
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="cursor-pointer"
                    />
                  </div>
                  {file && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" /> {file.name}
                    </p>
                  )}
                </div>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit ticket"}
                </Button>
              </div>
            </section>

            <section className="mt-6">
              <h2 className="font-semibold">Ticket history &amp; status</h2>
              {tickets.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No tickets yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {tickets.map((t) => (
                    <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{t.subject}</span>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[t.priority] ?? ""}`}>
                            {PRIORITIES.find((p) => p.id === t.priority)?.label ?? t.priority}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[t.status] ?? ""}`}>
                            {STATUS_LABEL[t.status] ?? t.status}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                        {CATEGORIES.find((c) => c.id === t.category)?.label ?? t.category}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">{t.message}</p>
                      {t.attachment_url && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-primary">
                          <ImageIcon className="h-3.5 w-3.5" /> Screenshot attached
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
