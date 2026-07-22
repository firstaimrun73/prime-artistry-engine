import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

const LINKS: { label: string; to: string }[] = [
  { label: "FAQ", to: "/faq" },
  { label: "Support Center", to: "/support" },
  { label: "Tickets", to: "/tickets" },
  { label: "Security", to: "/security" },
  { label: "Contact", to: "/support" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Privacy Policy", to: "/privacy" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="flex items-baseline gap-1.5 text-lg">
            MOTI<span className="text-primary">O2</span>EDIT
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              by Motion2AI
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Need help? <a href="mailto:support@motio2edit.com" className="hover:text-foreground">support@motio2edit.com</a>
        <span className="mx-2">·</span>
        © {new Date().getFullYear()} MOTIO2EDIT by Motion2AI. All rights reserved.
      </div>
    </footer>
  );
}
