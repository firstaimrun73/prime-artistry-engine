import { Link } from "@tanstack/react-router";
import { Shield, Lock, EyeOff, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const PILLARS = [
  {
    icon: Shield,
    title: "Your photos stay yours",
    body: "Content stays tied to your account. We do not sell your personal content for advertising.",
  },
  {
    icon: Lock,
    title: "Processing for the job only",
    body: "Uploads are sent to AI providers only as needed to produce results. Processing is temporary for generation workflows.",
  },
  {
    icon: EyeOff,
    title: "Access limited to you",
    body: "Authenticated sessions and owner-scoped access mean each user can only reach their own profile and generations.",
  },
] as const;

export function PrivacyPhilosophySection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16" aria-labelledby="privacy-philosophy-heading">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-secondary/40 px-6 py-8 text-center sm:px-10 sm:py-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Privacy-first AI
          </span>
          <h2
            id="privacy-philosophy-heading"
            className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl"
          >
            AI That Respects Your Privacy.{" "}
            <span className="text-primary">Creativity Without Compromise.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Most AI tools learn from your uploads. Motio2edit keeps your creativity yours.
            Your photos. Your creations. Your privacy.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-foreground/90">
            Create with AI. Stay in control of your data.
          </p>
        </div>

        <div className="grid gap-0 sm:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className={`flex flex-col p-6 sm:p-7 ${
                i < PILLARS.length - 1 ? "border-b border-border sm:border-b-0 sm:border-r" : ""
              }`}
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-bold">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-border bg-secondary/20 px-6 py-6 sm:flex-row sm:justify-between sm:px-10">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            Want the full picture on faces, training data, and your rights in AI image tools?
          </p>
          <Button asChild variant="outline" className="gap-2 shrink-0">
            <Link to="/learn/$slug" params={{ slug: "who-owns-your-face-ai-privacy" }}>
              Read the guide
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
