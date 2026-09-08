import { Shield, Zap, Sparkles } from "lucide-react";

const ITEMS = [
  {
    icon: Shield,
    title: "Secure credits",
    body: "Plan credits and payments stay server-verified — no client-side balance tricks.",
  },
  {
    icon: Zap,
    title: "Fast cloud AI",
    body: "Image, video, and music run on Motio2edit’s cloud pipeline so your device stays light.",
  },
  {
    icon: Sparkles,
    title: "One workspace",
    body: "Studios, Circle 2edit, Filters, Lenses, and Auto Edit in one Motio2edit account.",
  },
] as const;

export function TrustSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Built for creators</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Simple tools, clear credits, production-minded security.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-base font-bold">{title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
