import { Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Customer-facing account & privacy message for the pre-login homepage.
 * Distinguishes: (1) processing to complete a job, (2) storing results on the account,
 * (3) model training — Motio2edit does not train on customer content.
 * Aligns with Security: temporary processing for generation workflows.
 */
export function PrivacyPhilosophySection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16" aria-labelledby="privacy-heading">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="px-6 py-10 text-center sm:px-12 sm:py-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Your work</p>
          <h2
            id="privacy-heading"
            className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl"
          >
            Your creations belong to your creative journey.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Your uploads and generations are handled to provide the creative service you request. Your
            work stays associated with your account so you can access your projects and results.
          </p>

          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4">
            <div className="flex items-start gap-3 text-left sm:items-center sm:justify-center sm:text-center">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary sm:mt-0" />
              <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">
                Your content is not used to train AI models.
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Motio2edit processes media to complete the job you start, and keeps results with your
              account history. That is not the same as using your content to train AI models — and we
              do not do that.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-border bg-secondary/20 px-6 py-5 sm:flex-row sm:justify-between sm:px-10">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            More detail on Security and Privacy.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/security">
                Security
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/privacy">Privacy</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
