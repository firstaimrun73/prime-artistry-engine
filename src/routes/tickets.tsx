import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { submitTicket } from "@/lib/tickets.functions";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "Tickets — MOTIO2EDIT" },
      { name: "description", content: "Create support tickets, upload attachments, and track the status of your open and closed tickets." },
      { property: "og:title", content: "Tickets — MOTIO2EDIT" },
      { property: "og:description", content: "Create and track support tickets." },
    ],
  }),
  component: Tickets,
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

const CLOSED_STATUSES = new Set(["resolved", "closed"]);

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
  category: z.enum(["payment", "technical", "account", "feature_request", "bug_report", "other"]),
  priority: z.enum(["low", "normal", "high", "critical"]),
  subject: z.string().trim().min(3, "Subject is too short").max(120),
  message: z.string().trim().min(10, "Please describe the issue").max(2000),
});

function TicketCard({ t }: { t: Ticket }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
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
  );
}

function Tickets() {
  const { user } = useAuth();
  const createTicket = useServerFn(submitTicket);
  const [category, setCategory] = useState<string>("payment");
  const [priority, setPriority] = useState<string>("normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

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
    setCategory("payment");
    setPriority("normal");
    setSubject("");
    setMessage("");
    setFile(null);
  };

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
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("ticket-attachments").upload(path, file);
      if (upErr) {
        setSubmitting(false);
        toast.error(`Attachment failed: ${upErr.message}`);
        return;
      }
      attachment_url = path;
    }

    try {
      const result = await createTicket({
        data: {
          category: parsed.data.category,
          priority: parsed.data.priority,
          subject: parsed.data.subject,
          message: parsed.data.message,
          attachment_url,
        },
      });
      if (result.emailError) {
        toast.success(`Ticket ${result.code} created. (Email notification pending.)`);
      } else {
        toast.success(`Ticket ${result.code} received. A confirmation email is on its way.`);
      }
      clearForm();
      loadTickets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };


  const openTickets = tickets.filter((t) => !CLOSED_STATUSES.has(t.status));
  const closedTickets = tickets.filter((t) => CLOSED_STATUSES.has(t.status));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Tickets</h1>
        <p className="mt-3 text-muted-foreground">Create a ticket, attach files, and track its status.</p>

        {!user ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Sign in to create and track your tickets.</p>
            <Button asChild className="mt-4">
              <Link to="/auth" search={{}}>Sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <section className="mt-10 rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold">Create a ticket</h2>
              <div className="mt-4 space-y-4">
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
                    {submitting ? "Creating…" : "Create ticket"}
                  </Button>
                  <Button variant="outline" onClick={clearForm} disabled={submitting}>
                    Clear form
                  </Button>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <Tabs defaultValue="open">
                <TabsList>
                  <TabsTrigger value="open">Open ({openTickets.length})</TabsTrigger>
                  <TabsTrigger value="closed">Closed ({closedTickets.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="open" className="mt-4 space-y-3">
                  {openTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No open tickets.</p>
                  ) : (
                    openTickets.map((t) => <TicketCard key={t.id} t={t} />)
                  )}
                </TabsContent>
                <TabsContent value="closed" className="mt-4 space-y-3">
                  {closedTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No closed tickets.</p>
                  ) : (
                    closedTickets.map((t) => <TicketCard key={t.id} t={t} />)
                  )}
                </TabsContent>
              </Tabs>
            </section>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
