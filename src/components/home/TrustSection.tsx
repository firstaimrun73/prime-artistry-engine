import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Zap, Lock, Maximize2, Cpu } from "lucide-react";

const TRUST = [
  { icon: ShieldCheck, title: "Secure Payments", desc: "PCI-compliant checkout with trusted providers." },
  { icon: Zap, title: "Fast AI Processing", desc: "Cloud GPUs render most edits in under a minute." },
  { icon: Lock, title: "Privacy Protected", desc: "Your uploads stay private and are never resold." },
  { icon: Maximize2, title: "High Resolution Output", desc: "Export up to 4K images and 1080p video." },
  { icon: Cpu, title: "Modern AI Models", desc: "Latest image, video and music models, always updated." },
];

const STATS = [
  { label: "Images Generated", value: 128000, suffix: "+" },
  { label: "Videos Generated", value: 14500, suffix: "+" },
  { label: "Registered Users", value: 9200, suffix: "+" },
  { label: "Success Rate", value: 99, suffix: "%" },
];

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && setSeen(true),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const { ref, seen } = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      return;
    }
    const start = performance.now();
    const dur = 1600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value]);

  return (
    <span ref={ref} className="text-2xl font-extrabold text-primary sm:text-4xl">
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

export function TrustSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-3xl">Built to be trusted</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Secure, private and fast — from upload to final download.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {TRUST.map((t, i) => {
          const Icon = t.icon;
          return (
            <div
              key={t.title}
              className="reveal-up rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-bold">{t.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5 sm:mt-8 sm:gap-5 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="min-w-0 text-center">
            <Counter value={s.value} suffix={s.suffix} />
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
