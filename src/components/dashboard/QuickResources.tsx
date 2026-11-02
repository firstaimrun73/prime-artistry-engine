import { Link } from "@tanstack/react-router";
import {
  Settings,
  BookOpen,
  Crown,
  HelpCircle,
  Shield,
  Mail,
  Ticket,
  History,
} from "lucide-react";

const RESOURCES = [
  {
    to: "/settings" as const,
    icon: Settings,
    title: "Settings",
    body: "Theme, language, avatar & preferences",
  },
  {
    to: "/about" as const,
    icon: BookOpen,
    title: "About Product",
    body: "Studios, tools, credits & how editing works",
  },
  {
    to: "/pricing" as const,
    icon: Crown,
    title: "Pricing",
    body: "Plans and credit top-ups",
  },
  {
    to: "/faq" as const,
    icon: HelpCircle,
    title: "FAQ",
    body: "Common questions answered",
  },
  {
    to: "/security" as const,
    icon: Shield,
    title: "Security",
    body: "How we protect your data",
  },
  {
    to: "/support" as const,
    icon: Mail,
    title: "Support",
    body: "Help center & contact",
  },
  {
    to: "/tickets" as const,
    icon: Ticket,
    title: "Tickets",
    body: "Track support requests",
  },
  {
    to: "/history" as const,
    icon: History,
    title: "History",
    body: "All your creations",
  },
] as const;

export function QuickResources() {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Account & resources
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {RESOURCES.map(({ to, icon: Icon, title, body }) => (
          <Link
            key={to + title}
            to={to}
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <Icon className="h-4 w-4 text-primary" />
            <p className="mt-2 text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
