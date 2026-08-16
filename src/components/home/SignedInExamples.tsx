import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import sampleObjectBefore from "@/assets/sample-object-before.jpg";
import sampleObjectAfter from "@/assets/sample-object-after.jpg";
import sampleRemovalBefore from "@/assets/sample-removal-before.jpg";
import sampleRemovalAfter from "@/assets/sample-removal-after.jpg";
import sampleRestoreBefore from "@/assets/sample-restore-before.jpg";
import sampleRestoreAfter from "@/assets/sample-restore-after.jpg";
import sampleUpscaleBefore from "@/assets/sample-upscale-before.jpg";
import sampleUpscaleAfter from "@/assets/sample-upscale-after.jpg";

const PAIRS = [
  {
    id: "object",
    labelKey: "examples.objectRemoval",
    titleKey: "examples.objectRemovalTitle",
    before: sampleObjectBefore,
    after: sampleObjectAfter,
    prompt: "Remove the unwanted object completely and rebuild the background naturally",
  },
  {
    id: "circle",
    labelKey: "examples.circleRemove",
    titleKey: "examples.circleRemoveTitle",
    before: sampleRemovalBefore,
    after: sampleRemovalAfter,
    prompt: "Remove the circled person and rebuild the background naturally",
  },
  {
    id: "restore",
    labelKey: "examples.restore",
    titleKey: "examples.restoreTitle",
    before: sampleRestoreBefore,
    after: sampleRestoreAfter,
    prompt: "Restore this old damaged photo and improve clarity while keeping content intact",
  },
  {
    id: "upscale",
    labelKey: "examples.upscale",
    titleKey: "examples.upscaleTitle",
    before: sampleUpscaleBefore,
    after: sampleUpscaleAfter,
    prompt: "Upscale this image with sharper detail while preserving identity and composition",
  },
];

/** Real local before/after pairs only — no CSS-filter fakes. */
export function SignedInExamples() {
  const { t } = useI18n();

  const tryPrompt = (prompt: string) => {
    try {
      sessionStorage.setItem(
        "motio2edit-preset",
        JSON.stringify({ prompt, mode: "image", ts: Date.now() }),
      );
      sessionStorage.setItem("motio2edit-mode", "image");
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("examples.badge")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("examples.subtitle")}</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PAIRS.map((p) => (
          <article
            key={p.id}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="grid grid-cols-2 gap-px bg-border">
              <figure className="relative bg-card">
                <img
                  src={p.before}
                  alt={`${t(p.labelKey)} before`}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.4";
                  }}
                />
                <figcaption className="absolute left-2 top-2 rounded bg-background/85 px-2 py-0.5 text-[10px] font-semibold uppercase backdrop-blur">
                  {t("examples.before")}
                </figcaption>
              </figure>
              <figure className="relative bg-card">
                <img
                  src={p.after}
                  alt={`${t(p.labelKey)} after`}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.4";
                  }}
                />
                <figcaption className="absolute left-2 top-2 rounded bg-primary/90 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground backdrop-blur">
                  {t("examples.after")}
                </figcaption>
              </figure>
            </div>
            <div className="p-4">
              <p className="text-sm font-bold">{t(p.labelKey)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t(p.titleKey)}</p>
              <Button asChild size="sm" className="mt-3 w-full" onClick={() => tryPrompt(p.prompt)}>
                <Link to="/editor">{t("examples.try")}</Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
