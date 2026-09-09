/**
 * Homepage prompt bar — text + walking-man reference chips.
 * Multi-select refs with accuracy warning. Does not replace the full editor.
 */
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  WALKING_MAN_SAMPLES,
  REFERENCE_ACCURACY_NOTE,
} from "@/lib/samples/walking-man";
import { cn } from "@/lib/utils";

export function HomePromptBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const go = () => {
    try {
      if (prompt.trim()) sessionStorage.setItem("motio2edit-home-prompt", prompt.trim());
      if (selected.length) sessionStorage.setItem("motio2edit-home-refs", JSON.stringify(selected));
      sessionStorage.setItem("motio2edit-mode", "image");
    } catch {
      /* ignore */
    }
    if (!user) {
      void navigate({ to: "/auth", search: { redirect: "/editor" } });
      return;
    }
    void navigate({ to: "/editor" });
  };

  return (
    <section
      className="mt-12 rounded-3xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-6"
      data-home-section="prompt-bar"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-extrabold tracking-tight">Describe & reference</h2>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        One primary reference is best for accuracy. Motion2AI can use extra refs for style — too many
        lowers consistency.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="Describe motion, pose, clothing, camera angle, background, and style…"
        className="mt-3 w-full resize-none rounded-2xl border border-border bg-background/80 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
      />

      <p className="mt-3 text-[11px] font-semibold text-muted-foreground">Walking references</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {WALKING_MAN_SAMPLES.map((s) => {
          const on = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition",
                on ? "border-primary ring-2 ring-primary/40" : "border-border opacity-90 hover:opacity-100",
              )}
              aria-pressed={on}
              aria-label={s.alt}
            >
              <img
                src={s.url}
                alt={s.alt}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  console.warn("[walking-man] failed", s.url);
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                }}
              />
              {on && (
                <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const s = WALKING_MAN_SAMPLES.find((x) => x.id === id);
            if (!s) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px]"
              >
                {s.label}
                <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${s.label}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {selected.length >= 3 && (
        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">{REFERENCE_ACCURACY_NOTE}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" className="rounded-full" onClick={go}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          Open Image Studio
        </Button>
        <Button type="button" variant="outline" className="rounded-full" asChild>
          <Link to={user ? "/studio/image/lens-editor" : "/auth"} search={user ? undefined : { redirect: "/studio/image/lens-editor" }}>
            <ImagePlus className="mr-1.5 h-4 w-4" />
            Lens camera
          </Link>
        </Button>
      </div>
    </section>
  );
}
