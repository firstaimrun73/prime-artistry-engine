import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

const LINKS = [
  { to: "/faq", label: "FAQ" },
  { to: "/security", label: "Security" },
  { to: "/support", label: "Support" },
  { to: "/tickets", label: "Tickets" },
  { to: "/pricing", label: "Pricing" },
  { to: "/privacy", label: "Privacy" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-lg">
            MOTIO<span className="text-primary">2</span>EDIT
          </span>
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "text-foreground" }}
              className="transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} MOTIO2EDIT. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
