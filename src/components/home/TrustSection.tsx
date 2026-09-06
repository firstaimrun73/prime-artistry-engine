import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Zap, Lock, Maximize2, Cpu } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Your uploads are processed securely and never used to train public models.",
  },
  {
    icon: Zap,
    title: "Fast results",
    body: "Most edits complete in seconds so you can stay in flow.",
  },
  {
    icon: Lock,
    title: "Secure credits",
    body: "Server-side billing with transparent costs — no surprise charges.",
  },
  {
    icon: Maximize2,
    title: "Pro quality",
    body: "High-resolution exports ready for social, print, and production.",
  },
  {
    icon: Cpu,
    title: "Motion2AI Engine",
    body: "Unified AI engine powering image, video and music creation.",
  },
] as const;

export function TrustSection() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Built for creators who care</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Motion2AI powers every studio — simple controls, serious quality.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRUST_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`rounded-2xl border border-border bg-card p-5 transition-all duration-500 ${
                visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="mb-3 inline-flex rounded-xl border border-border bg-background/60 p-2.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-bold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
