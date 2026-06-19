import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  LifeBuoy,
  Ticket as TicketIcon,
  BookOpen,
  Wrench,
  Activity,
  Mail,
  Clock,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support Center — MOTIO2EDIT" },
      { name: "description", content: "Get help with MOTIO2EDIT: help center, knowledge base, troubleshooting guides, system status, support tickets, and contact options." },
      { property: "og:title", content: "Support Center — MOTIO2EDIT" },
      { property: "og:description", content: "Help center, knowledge base, troubleshooting, and ticket support." },
    ],
  }),
  component: Support,
});

type Resource = {
  icon: typeof LifeBuoy;
  title: string;
  body: string;
  to?: string;
  href?: string;
};

const RESOURCES: Resource[] = [
  { icon: HelpCircle, title: "Help Center", body: "Browse common questions and quick answers in our FAQ.", to: "/faq" },
  { icon: TicketIcon, title: "Contact Support", body: "Create a ticket and track its status until it's resolved.", to: "/tickets" },
  { icon: BookOpen, title: "Knowledge Base", body: "Guides on credits, generation, and getting the best results.", to: "/faq" },
  { icon: Wrench, title: "Troubleshooting Guides", body: "Fix upload, rendering, and login issues step by step.", to: "/faq" },
  { icon: Activity, title: "System Status", body: "Check current platform availability and incident history.", href: "https://status.motio2edit.com" },
  { icon: ShieldCheck, title: "Security & Privacy", body: "Learn how we protect your account and your content.", to: "/security" },
];

function Support() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center">
          <LifeBuoy className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Support Center</h1>
          <p className="mt-3 text-muted-foreground">Everything you need to get help, fast.</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.map(({ icon: Icon, title, body, to, href }) => {
            const inner = (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="mt-4 font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </>
            );
            const className =
              "block rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary";
            if (href) {
              return (
                <a key={title} href={href} target="_blank" rel="noopener noreferrer" className={className}>
                  {inner}
                </a>
              );
            }
            return (
              <Link key={title} to={to!} className={className}>
                {inner}
              </Link>
            );
          })}
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Mail className="h-4 w-4 text-primary" /> Email support
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Prefer email? Reach us at{" "}
              <a href="mailto:support@motio2edit.com" className="text-primary hover:underline">support@motio2edit.com</a>.
            </p>
          </section>
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4 text-primary" /> Response time
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We typically respond within 24 hours. Paid plans receive priority handling for faster replies.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
