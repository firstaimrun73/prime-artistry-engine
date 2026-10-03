import { createFileRoute, Link } from "@tanstack/react-router";
import { FooterAd } from "@/components/ads";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Ticket as TicketIcon,
  BookOpen,
  Wrench,
  Activity,
  Mail,
  MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Motio2edit" },
      {
        name: "description",
        content:
          "Get help with MOTIO2EDIT: help center, knowledge base, troubleshooting guides, system status, support tickets, and contact options.",
      },
    ],
  }),
  component: SupportPage,
});

type Resource = {
  icon: typeof TicketIcon;
  title: string;
  body: string;
  to?: string;
  href?: string;
};

const RESOURCES: Resource[] = [
  { icon: TicketIcon, title: "Contact Support", body: "Create a ticket and track its status until it's resolved.", to: "/tickets" },
  { icon: BookOpen, title: "Knowledge Base", body: "Browse guides for studios, credits, and account settings.", to: "/faq" },
  { icon: Wrench, title: "Troubleshooting Guides", body: "Fix upload, rendering, and login issues step by step.", to: "/faq" },
  { icon: Activity, title: "Troubleshooting", body: "Common fixes for upload, rendering, login, and account issues.", to: "/faq" },
  { icon: MessageCircle, title: "Community tips", body: "Product FAQs and how-to answers for Motio2edit features.", to: "/faq" },
];

function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-12 pb-24 sm:py-16 md:pb-16">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Support Center</h1>
          <p className="mt-3 text-muted-foreground">
            We are here to help you get the most out of Motio2edit.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.map(({ icon: Icon, title, body, to, href }) => {
            const className =
              "flex h-full min-h-[10rem] flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary";
            const inner = (
              <>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="mt-4 font-semibold">{title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </>
            );
            if (href) {
              return (
                <a key={title} href={href} target="_blank" rel="noopener noreferrer" className={className}>
                  {inner}
                </a>
              );
            }
            if (to) {
              return (
                <Link key={title} to={to} className={className}>
                  {inner}
                </Link>
              );
            }
            return (
              <div key={title} className={className}>
                {inner}
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center">
          <Mail className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Email us</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Reach{" "}
            <a href="mailto:support@motio2edit.com" className="text-primary hover:underline">
              support@motio2edit.com
            </a>
            .
          </p>
        </div>
      </div>
      <FooterAd />
      <Footer />
    </div>
  );
}
