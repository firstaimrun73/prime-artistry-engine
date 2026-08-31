/**
 * Compact premium Circle 2edit homepage showcase.
 * ONE card only — no carousel. Links to circle-info, not directly to editor.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Circle } from "lucide-react";
import { CompareSlider } from "@/components/CompareSlider";
import { getPrimaryCircleSample } from "@/lib/circle-edit/circle-samples";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function Circle2editFeatureCard({ className }: Props) {
  const sample = getPrimaryCircleSample();

  return (
    <section className={cn("mt-6", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Circle 2edit
        </h2>
        <Link
          to={sample.detailsHref}
          className="text-xs font-semibold text-[#7B6FE0] hover:underline"
        >
          How it works
        </Link>
      </div>

      <Link
        to={sample.detailsHref}
        className="group block overflow-hidden rounded-2xl border border-[#7B6FE0]/40 bg-gradient-to-br from-[rgba(123,111,224,0.10)] via-card to-card shadow-md transition-all hover:border-[#7B6FE0]/65 hover:shadow-[0_8px_28px_rgba(123,111,224,0.18)]"
      >
        <div className="flex items-start gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#7B6FE0]/18 text-[#7B6FE0]">
            <Circle className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold tracking-tight">
                Circle <span className="italic text-[#7B6FE0]">2</span>edit
              </p>
              <span className="rounded-full border border-[#7B6FE0]/35 bg-[rgba(123,111,224,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7B6FE0]">
                {sample.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {sample.operation} · Mark · Restore
            </p>
          </div>
          <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[#7B6FE0] transition-transform group-hover:translate-x-1" />
        </div>

        {/* Interactive comparison — stopPropagation so drag does not navigate */}
        <div
          className="px-3 pb-2 sm:px-4"
          onClick={(e) => e.preventDefault()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="overflow-hidden rounded-xl border border-[#7B6FE0]/30 ring-1 ring-[#7B6FE0]/15">
            <CompareSlider before={sample.beforeImage} after={sample.afterImage} />
          </div>
        </div>

        <div className="space-y-2 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
          <p className="text-[12px] leading-snug text-muted-foreground line-clamp-2">
            {sample.description}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span className="font-medium text-[#7B6FE0]">{sample.attribution}</span>
            <span aria-hidden>·</span>
            <span>{sample.dateLabel}</span>
          </div>
          <p className="text-center text-[11px] font-semibold text-[#7B6FE0]">
            View details →
          </p>
        </div>
      </Link>
    </section>
  );
}
