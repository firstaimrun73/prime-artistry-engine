import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:pb-24">
      <div className="glass-panel relative overflow-hidden rounded-3xl p-6 text-center sm:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full gradient-hero opacity-30 blur-3xl" />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Free credits on signup
        </span>
        <h2 className="relative mx-auto mt-4 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-4xl">
          Create Amazing AI Content in Minutes
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Images, videos and music — start free and upgrade only when you need more.
        </p>
        <div className="relative mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="btn-animate">
            <Link to="/editor">
              Start Creating <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="btn-animate">
            <Link to="/pricing">View Pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
