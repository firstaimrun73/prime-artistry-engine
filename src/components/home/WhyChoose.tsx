import { Layers, Sparkles, Zap, Cpu, LayoutGrid, Smartphone } from "lucide-react";

const ITEMS = [
  { icon: Layers, title: "Preserve Original Structure", desc: "Edits keep your composition, angles and proportions intact." },
  { icon: Sparkles, title: "Realistic AI Results", desc: "Natural lighting and shadows, not obvious AI artifacts." },
  { icon: Zap, title: "Fast Cloud Rendering", desc: "Dedicated GPUs deliver most results in well under a minute." },
  { icon: Cpu, title: "Multiple AI Models", desc: "The right model is picked automatically for each task." },
  { icon: LayoutGrid, title: "One Platform for Image, Video & Music", desc: "Three studios, one login, one credit balance." },
  { icon: Smartphone, title: "Mobile Friendly", desc: "Full editing power on phone, tablet and desktop." },
];

export function WhyChoose() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-3xl">Why choose MOTIO2EDIT</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Built for creators who need results that actually look real.
        </p>
      </div>
      <div className="mt-6 grid grid-cols-1 items-stretch gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {ITEMS.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="reveal-up flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
