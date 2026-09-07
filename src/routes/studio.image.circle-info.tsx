/**
 * Circle 2edit information + per-sample detail page.
 * Route: /studio/image/circle-info
 * Back always → homepage (never Image Studio).
 * Visual demo: Before + After only (1:1), no blank middle stages.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Circle,
  Layers,
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import {
  getActiveCircleSamples,
  getCircleSampleById,
  resolveCircleSampleMediaUrl,
  circleSampleTryHref,
  type CircleSample,
} from "@/lib/circle-edit/circle-samples";
import { findAddAsset } from "@/lib/circle-edit/add-assets";
import { AssetIcon } from "@/components/circle-edit/AssetIcon";

type CircleInfoSearch = {
  sampleId?: string;
};

export const Route = createFileRoute("/studio/image/circle-info")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): CircleInfoSearch => {
    const sampleId =
      typeof raw.sampleId === "string" && raw.sampleId.length > 0 && raw.sampleId.length <= 80
        ? raw.sampleId
        : undefined;
    return { sampleId };
  },
  component: Circle2editInfoPage,
  head: () => ({
    meta: [
      { title: "Circle 2edit — Motio2edit" },
      {
        name: "description",
        content:
          "Mark an area and use AI to remove or add objects naturally. Circle 2edit by Motio2edit.",
      },
    ],
  }),
});

function BeforeAfterPair({
  beforeSrc,
  afterSrc,
  objectLabel,
  isRemove,
  isDark,
}: {
  beforeSrc: string;
  afterSrc: string;
  objectLabel: string;
  isRemove: boolean;
  isDark: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[15px] font-bold tracking-tight">Before and After</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="overflow-hidden rounded-2xl border border-[#7B6FE0]/25 bg-black/5">
            <div className="relative aspect-square w-full">
              <img
                src={beforeSrc}
                alt={`Before — ${objectLabel}`}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </div>
          <p className="text-[12px] font-bold text-[#7B6FE0]">Before</p>
          <p className={cn("text-[11px] leading-snug", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            {isRemove ? `Scene with ${objectLabel}` : "Scene without the object"}
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="overflow-hidden rounded-2xl border border-[#7B6FE0]/25 bg-black/5">
            <div className="relative aspect-square w-full">
              <img
                src={afterSrc}
                alt={`After — ${objectLabel}`}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </div>
          <p className="text-[12px] font-bold text-[#7B6FE0]">After</p>
          <p className={cn("text-[11px] leading-snug", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            {isRemove ? `${objectLabel} removed cleanly` : `${objectLabel} added naturally`}
          </p>
        </div>
      </div>
    </section>
  );
}

function SimpleFlow({ isRemove, objectLabel, isDark }: { isRemove: boolean; objectLabel: string; isDark: boolean }) {
  const steps = isRemove
    ? [
        { n: "1", title: "Upload", body: "Your photo" },
        { n: "2", title: "Mark", body: `Circle the ${objectLabel.toLowerCase()}` },
        { n: "3", title: "Remove", body: "AI fills the area" },
      ]
    : [
        { n: "1", title: "Upload", body: "Your photo" },
        { n: "2", title: "Place", body: `Paint where ${objectLabel.toLowerCase()} goes` },
        { n: "3", title: "Add", body: "Lighting-matched result" },
      ];
  return (
    <section className="space-y-3">
      <h2 className="text-[15px] font-bold tracking-tight">How it works</h2>
      <div className="grid grid-cols-3 gap-2">
        {steps.map((s) => (
          <div
            key={s.n}
            className={cn(
              "rounded-2xl border p-3 text-center",
              isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white/90",
            )}
          >
            <p className="text-[11px] font-bold text-[#7B6FE0]">
              {s.n}. {s.title}
            </p>
            <p className={cn("mt-1 text-[11px] leading-snug", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureDetail({
  sample,
  isDark,
  user,
  onStart,
}: {
  sample: CircleSample;
  isDark: boolean;
  user: unknown;
  onStart: () => void;
}) {
  const beforeSrc = useMemo(() => resolveCircleSampleMediaUrl(sample, { stage: "before" }), [sample]);
  const afterSrc = useMemo(() => resolveCircleSampleMediaUrl(sample, { stage: "after" }), [sample]);
  const asset = sample.assetId ? findAddAsset(sample.assetId) : null;
  const tryHref = circleSampleTryHref(sample, "sample");
  const isRemove = sample.mode === "remove";

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[rgba(123,111,224,0.15)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7B6FE0]">
            Circle 2edit
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              isRemove
                ? isDark
                  ? "bg-white/15 text-white"
                  : "bg-black/70 text-white"
                : "bg-[#7B6FE0] text-white",
            )}
          >
            {isRemove ? "Remove" : "Add"}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {isRemove ? `Remove ${sample.objectLabel}` : sample.title}
        </h1>
        <p className={cn("text-[14px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
          {sample.description}
        </p>
      </section>

      <BeforeAfterPair
        beforeSrc={beforeSrc}
        afterSrc={afterSrc}
        objectLabel={sample.objectLabel}
        isRemove={isRemove}
        isDark={isDark}
      />

      <SimpleFlow isRemove={isRemove} objectLabel={sample.objectLabel} isDark={isDark} />

      <section
        className={cn(
          "rounded-2xl border p-4",
          isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white/90",
        )}
      >
        <h2 className="mb-3 text-[14px] font-bold tracking-tight">Details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Object</dt>
            <dd className="font-semibold">{sample.objectLabel}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Action</dt>
            <dd className="font-semibold">{isRemove ? "Remove" : "Add"}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Aspect</dt>
            <dd className="font-semibold">{sample.aspectRatio}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Quality</dt>
            <dd className="font-semibold">{sample.quality}</dd>
          </div>
          {asset ? (
            <div className="col-span-2 flex items-center gap-2 pt-1">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(123,111,224,0.15)]">
                <AssetIcon asset={asset} size={22} isDark={isDark} selected />
              </span>
              <span className="text-[12px] font-semibold">{asset.name}</span>
            </div>
          ) : null}
        </dl>
      </section>

      <Link
        to={tryHref as "/studio/image/circle-remove"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7B6FE0] px-5 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[rgba(123,111,224,0.35)] transition active:scale-[0.98]"
        onClick={(e) => {
          if (!user) {
            e.preventDefault();
            onStart();
          }
        }}
      >
        <Sparkles className="h-4 w-4" />
        Try Now
        <ArrowRight className="h-4 w-4" />
      </Link>
      {!user && (
        <p className={cn("text-center text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Sign in required before the editor opens.
        </p>
      )}
    </div>
  );
}

function Circle2editInfoPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sampleId } = Route.useSearch();

  const sample = useMemo(() => {
    if (!sampleId) return null;
    return getCircleSampleById(sampleId) ?? getActiveCircleSamples().find((s) => s.id === sampleId) ?? null;
  }, [sampleId]);

  const start = () => {
    if (user) {
      if (sample) {
        navigate({ to: circleSampleTryHref(sample, sampleId ? "sample" : "info") as "/studio/image/circle-remove" });
      } else {
        navigate({ to: "/studio/image/circle-remove?from=info" as "/studio/image/circle-remove" });
      }
    } else {
      navigate({ to: "/auth" as "/auth" });
    }
  };

  return (
    <div
      className={cn(
        "min-h-[100dvh] pb-28",
        isDark ? "bg-[#12141A] text-[#F2F2F5]" : "bg-[#F4F5F8] text-[#1A1C24]",
      )}
      data-circle-info="true"
    >
      <header
        className={cn(
          "sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-xl",
          isDark ? "border-white/8 bg-[#181A22]/90" : "border-black/6 bg-white/85",
        )}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/", replace: true })}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl border",
            isDark ? "border-white/10" : "border-black/8",
          )}
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold tracking-tight">
            Circle <span style={{ color: "#7B6FE0", fontStyle: "italic" }}>2</span>edit
          </p>
          <p className={cn("text-[10px] font-medium tracking-wide", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            {sample ? sample.title : "Mark · Remove · Add"}
          </p>
        </div>
      </header>

      {sample ? (
        <FeatureDetail sample={sample} isDark={isDark} user={user} onStart={start} />
      ) : (
        <div className="mx-auto max-w-2xl space-y-10 px-4 py-8">
          <section className="relative overflow-hidden rounded-3xl border border-[#7B6FE0]/35 bg-gradient-to-br from-[rgba(123,111,224,0.18)] via-transparent to-transparent p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7B6FE0]">Circle 2edit</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Mark. Remove. Add.
            </h1>
            <p className={cn("mt-2 max-w-md text-[14px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
              Draw a region, then let AI erase or insert objects that match lighting and perspective of your photo.
            </p>
            <button
              type="button"
              onClick={start}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#7B6FE0] px-5 py-3 text-[14px] font-semibold text-white shadow-lg shadow-[rgba(123,111,224,0.35)] transition active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              {user ? "Try Now" : "Start Now"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>

          <section className="space-y-3">
            <h2 className="text-[15px] font-bold tracking-tight">Workflow</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Circle, label: "Mark", body: "Circle · Brush · Eraser" },
                { icon: Layers, label: "Choose", body: "Remove or Add" },
                { icon: Sparkles, label: "Generate", body: "Matched result" },
              ].map(({ icon: Icon, label, body }) => (
                <div
                  key={label}
                  className={cn(
                    "rounded-2xl border p-3 text-center backdrop-blur-md",
                    isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white/80",
                  )}
                >
                  <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[rgba(123,111,224,0.15)] text-[#7B6FE0]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-2 text-[12px] font-bold">{label}</p>
                  <p className={cn("text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[15px] font-bold tracking-tight">Samples</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {getActiveCircleSamples().slice(0, 4).map((s) => {
                const src = resolveCircleSampleMediaUrl(s, { stage: "before" });
                return (
                  <Link
                    key={s.id}
                    to="/studio/image/circle-info"
                    search={{ sampleId: s.id }}
                    className={cn(
                      "flex gap-3 rounded-2xl border p-3 transition hover:border-[#7B6FE0]/40",
                      isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white/90",
                    )}
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{s.title}</p>
                      <p className={cn("text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
                        {s.mode === "remove" ? "Remove" : "Add"} · {s.aspectRatio}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
