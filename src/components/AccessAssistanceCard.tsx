import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Compact, professional free-access application entry (not a discount banner). */
export function AccessAssistanceCard({ className = "" }: { className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 ${className}`}
      aria-label="Access assistance"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold tracking-tight sm:text-lg">
            AI access should be within everyone's reach
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Can't afford a subscription right now? Tell us about your creative goals. Our team reviews
            individual requests and may offer limited complimentary access to selected AI tools.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Every request is reviewed individually. Free access is limited and subject to approval.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/access-assistance">Request free access</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
