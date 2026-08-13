import { Zap, Shield, Sparkles, Layers } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Pro-grade AI edits",
    desc: "Face, clothing, background and object edits that preserve identity and composition.",
  },
  {
    icon: Zap,
    title: "Fast workflow",
    desc: "Upload, prompt, generate — results in seconds with clear credit costs.",
  },
  {
    icon: Layers,
    title: "Three studios",
    desc: "Image, Video and Music in one Motio2edit workspace.",
  },
  {
    icon: Shield,
    title: "Secure & private",
    desc: "Authenticated accounts, private storage and plan-based download protection.",
  },
];

export function WhyChoose() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-3xl">
          Why choose Motio<span className="text-primary">2</span>edit
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Built for creators who need reliable AI edits without losing the original subject.
        </p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
