import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  LifeBuoy,
  Rocket,
  Wrench,
  Mail,
  Ticket as TicketIcon,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support Center — MOTIO2EDIT" },
      { name: "description", content: "Help center, getting started guide, common issues and support information for MOTIO2EDIT." },
      { property: "og:title", content: "Support Center — MOTIO2EDIT" },
      { property: "og:description", content: "Help center, getting started guide and common issues for MOTIO2EDIT." },
    ],
  }),
  component: Support,
});

const GETTING_STARTED = [
  "Create a free account — you start with 50 credits (about 4 images).",
  "Open the Editor, write a prompt, and optionally upload a reference.",
  "Generate your result, preview it, and download the output.",
  "Upgrade to Plus, Pro or Studio for more credits, video and faster processing.",
];

const COMMON_ISSUES = [
  { q: "I ran out of credits.", a: "Free accounts include 50 credits. Upgrade on the Pricing page for a larger monthly allowance." },
  { q: "Video generation is locked.", a: "Video is available on Pro and Studio plans. Upgrade to unlock it." },
  { q: "My payment didn't go through.", a: "Check your card details and currency, then retry. If it persists, open a ticket with the Payment category." },
  { q: "I forgot my password.", a: "Use the reset link on the sign-in page, or change it any time from Settings once signed in." },
];

function Support() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Support Center</h1>
        <p className="mt-3 text-muted-foreground">
          Find answers fast, learn the basics, or reach our team.
        </p>

        <section className="mt-10 grid gap-5 sm:grid-cols-3">
          <Link to="/faq" className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-semibold">Help Center</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Browse frequently asked questions.</p>
          </Link>
          <Link to="/tickets" className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
            <TicketIcon className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-semibold">Tickets</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Create and track support tickets.</p>
          </Link>
          <Link to="/security" className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-semibold">Security</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">How we keep your data safe.</p>
          </Link>
        </section>

        <section className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <Rocket className="h-4 w-4 text-primary" /> Getting Started Guide
          </h2>
          <ol className="mt-4 space-y-3">
            {GETTING_STARTED.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <Wrench className="h-4 w-4 text-primary" /> Common Issues
          </h2>
          <div className="mt-4 space-y-4">
            {COMMON_ISSUES.map((item) => (
              <div key={item.q}>
                <p className="text-sm font-medium">{item.q}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <LifeBuoy className="h-4 w-4 text-primary" /> Support Information
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Still need help? Create a ticket and our team will follow up. You can also email us at{" "}
            <a href="mailto:support@motio2edit.com" className="text-primary hover:underline">
              support@motio2edit.com
            </a>.
          </p>
          <Button asChild className="mt-4">
            <Link to="/tickets">Create a ticket</Link>
          </Button>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Mail className="h-4 w-4 text-primary" />
          <p className="mt-2">Typical response time: within 24–48 hours on business days.</p>
        </section>
      </div>
      <Footer />
    </div>
  );
}
