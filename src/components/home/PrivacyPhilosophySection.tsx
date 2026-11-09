import { Link } from "@tanstack/react-router";
import { FolderOpen, Workflow, UserRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PILLARS = [
  {
    icon: FolderOpen,
    title: "Your creative workspace",
    body: "Generations and projects you create stay linked to your Motio2edit account so you can revisit and download them later.",
  },
  {
    icon: Workflow,
    title: "Processing for the requested job",
    body: "When you run an edit or generation, files are processed through the job pipeline needed to complete that request.",
  },
  {
    icon: UserRound,
    title: "Account-scoped access",
    body: "Signed-in sessions are designed so you work in your own profile and history — not another account’s workspace.",
  },
] as const;

export function PrivacyPhilosophySection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16" aria-labelledby="account-first-heading">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-secondary/40 px-6 py-8 text-center sm:px-10 sm:py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Account-first design</p>
          <h2
            id="account-first-heading"
            className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl"
          >
            Your creations. Your account. Your workspace.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Create, edit and revisit your creative work with Motio2edit. Your account gives you a personal
            workspace for your generations and saved projects.
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
            Operational details live on Security and Privacy.
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
