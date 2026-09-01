/**
 * Circle 2edit homepage — exactly 25 sample cards in a responsive GRID.
 * No carousel. Purple branded boundary. Download + Try Now.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ArrowRight, Circle } from "lucide-react";
import { CompareSlider } from "@/components/CompareSlider";
import {
  CIRCLE_SAMPLES,
  CIRCLE_SAMPLE_COUNT,
  type CircleSample,
} from "@/lib/circle-edit/circle-samples";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function SampleCard({
  sample,
  onOpen,
}: {
  sample: CircleSample;
  onOpen: (s: CircleSample) => void;
}) {
  return (
    <article
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#7B6FE0]/40 bg-gradient-to-br from-[rgba(123,111,224,0.08)] via-card to-card shadow-md transition-all hover:border-[#7B6FE0]/70 hover:shadow-[0_8px_28px_rgba(123,111,224,0.16)]"
    >
      <button
        type="button"
        onClick={() => onOpen(sample)}
        className="block w-full text-left"
      >
        <div className="relative grid grid-cols-2 gap-px bg-[#7B6FE0]/20">
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={sample.beforeImage}
              alt={`${sample.title} before`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              Before
            </span>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={sample.afterImage}
              alt={`${sample.title} after`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <span className="absolute left-1.5 top-1.5 rounded bg-[#7B6FE0]/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              After
            </span>
          </div>
        </div>
        <div className="space-y-1.5 p-3 sm:p-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-[#7B6FE0]/35 bg-[rgba(123,111,224,0.12)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#7B6FE0]">
              {sample.label}
            </span>
            {sample.secondaryLabel ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                {sample.secondaryLabel}
              </span>
            ) : null}
          </div>
          <h3 className="text-[13px] font-bold leading-snug tracking-tight line-clamp-2">
            {sample.title}
          </h3>
          <p className="text-[10px] text-muted-foreground">
            {sample.category} · {sample.quality} · {sample.aspectRatio}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {sample.dateLabel} · {sample.timeLabel}
          </p>
          <p className="text-[10px] font-medium text-[#7B6FE0]">{sample.attribution}</p>
          <p className="text-[9px] text-muted-foreground">{sample.poweredBy}</p>
        </div>
      </button>
      <div className="mt-auto flex gap-2 border-t border-[#7B6FE0]/15 px-3 py-2.5">
        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const res = await fetch(sample.afterImage);
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `motio2edit-${sample.id}.jpg`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              toast.error("Download failed");
            }
          }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted/50"
        >
          <Download className="h-3 w-3" /> Download
        </button>
        <Link
          to={sample.tryHref.split("?")[0] as "/studio/image/circle-remove"}
          search={(() => {
            try {
              const q = new URLSearchParams(sample.tryHref.split("?")[1] ?? "");
              const mode = q.get("mode") ?? undefined;
              const assetId = q.get("assetId") ?? undefined;
              return { mode, assetId };
            } catch {
              return {};
            }
          })()}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#7B6FE0] px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-[#6A5FD0]"
        >
          Try Now <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}

function DetailModal({
  sample,
  onClose,
}: {
  sample: CircleSample;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative z-[61] max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#7B6FE0]/40 bg-card p-4 shadow-2xl sm:rounded-2xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#7B6FE0]">
              {sample.operation}
            </p>
            <h2 className="text-base font-bold">{sample.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>
        <div
          className="overflow-hidden rounded-xl border border-[#7B6FE0]/30"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <CompareSlider before={sample.beforeImage} after={sample.afterImage} />
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          {sample.description}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span>{sample.category}</span>
          <span>{sample.quality}</span>
          <span>{sample.aspectRatio}</span>
          <span>
            {sample.dateLabel} · {sample.timeLabel}
          </span>
        </div>
        <p className="mt-1 text-[11px] font-medium text-[#7B6FE0]">{sample.attribution}</p>
        <p className="text-[10px] text-muted-foreground">{sample.poweredBy}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch(sample.afterImage);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `motio2edit-${sample.id}.jpg`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                toast.error("Download failed");
              }
            }}
            className="flex-1 rounded-xl border border-border py-2.5 text-[13px] font-semibold"
          >
            Download
          </button>
          <Link
            to={"/studio/image/circle-remove"}
            search={(() => {
              const q = new URLSearchParams(sample.tryHref.split("?")[1] ?? "");
              return {
                mode: q.get("mode") ?? undefined,
                assetId: q.get("assetId") ?? undefined,
              };
            })()}
            className="flex flex-1 items-center justify-center rounded-xl bg-[#7B6FE0] py-2.5 text-[13px] font-semibold text-white"
            onClick={onClose}
          >
            Try Now
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Circle2editSampleGallery({ className }: { className?: string }) {
  const samples = useMemo(() => CIRCLE_SAMPLES, []);
  const [detail, setDetail] = useState<CircleSample | null>(null);

  return (
    <section className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:py-10", className)}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#7B6FE0]/15 text-[#7B6FE0]">
              <Circle className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Circle <span className="italic text-[#7B6FE0]">2</span>edit
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Remove unwanted objects. Add new objects. Mark · Restore · Match lighting.
          </p>
        </div>
        <Link
          to="/studio/image/circle-info"
          className="text-xs font-semibold text-[#7B6FE0] hover:underline"
        >
          How it works →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {samples.map((s) => (
          <SampleCard key={s.id} sample={s} onOpen={setDetail} />
        ))}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        {CIRCLE_SAMPLE_COUNT} samples · Circle 2edit · Motio2edit
      </p>

      {detail ? <DetailModal sample={detail} onClose={() => setDetail(null)} /> : null}
    </section>
  );
}
