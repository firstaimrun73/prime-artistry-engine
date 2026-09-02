/**
 * Circle 2edit information + per-sample detail page.
 * Route: /studio/image/circle-info
 * Optional search: ?sampleId=rm-butterfly | add-dog | …
 * Generic product page when no sampleId; dedicated SAMPLE detail when sampleId is present.
 * ⓘ on a sample MUST open this with that sampleId (never generic Image Studio / editor).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Circle,
  Brush,
  Eraser,
  Layers,
  Info,
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

const FAQ = [
  {
    q: "What is Circle 2edit?",
    a: "A dedicated product for marking a region on a photo and either removing content or adding a curated object with lighting, perspective, and shadow match.",
  },
  {
    q: "How is Remove different from Add?",
    a: "Remove erases the marked region and fills it naturally. Add places a chosen object (animals, vehicles, objects, nature) into the painted placement area.",
  },
  {
    q: "Do I need a paid plan?",
    a: "Circle Remove is available on free with credits. Circle Add requires a paid plan. Credits are charged server-side per operation.",
  },
  {
    q: "What marking tools are available?",
    a: "Circle (A→B freehand lasso), Brush for precise paint, and Eraser to correct the mask — with undo/redo.",
  },
  {
    q: "Is the watermark required?",
    a: "Circle outputs use a Circle-specific Motio 2 Edit purple-ring mark. Free plans always include it; paid users can toggle it. Server export enforces the setting.",
  },
  {
    q: "Where do samples live?",
    a: "After sign-in, the homepage shows Circle feature cards. Try Now opens the editor with the same asset and mode preserved.",
  },
] as const;

function StageFrame({
  label,
  caption,
  src,
  showMark,
  isDark,
}: {
  label: string;
  caption: string;
  src: string;
  showMark?: boolean;
  isDark: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-[#7B6FE0]/25">
        <div className="relative aspect-[4/5] w-full max-h-[280px] bg-black/10">
          <img src={src} alt={label} className="h-full w-full object-cover" />
          {showMark ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="relative h-[42%] w-[42%] rounded-full border-[3px] border-[#7B6FE0]"
                style={{
                  boxShadow:
                    "0 0 0 9999px rgba(123,111,224,0.2), 0 0 22px rgba(123,111,224,0.4)",
                  background: "rgba(123,111,224,0.16)",
                }}
              >
                <span className="absolute inset-[16%] rounded-full border-2 border-dashed border-white/70" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div>
        <p className="text-[12px] font-bold text-[#7B6FE0]">{label}</p>
        <p className={cn("text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{caption}</p>
      </div>
    </div>
  );
}

function RemoveBlockDiagram({ isDark }: { isDark: boolean }) {
  const steps = [
    { n: "1", title: "Upload Image", body: "Flower + Butterfly" },
    { n: "2", title: "Mark Object", body: "Purple circle + shaded selection" },
    { n: "3", title: "AI Analyses", body: "Understands the selected region" },
    { n: "4", title: "AI Removes", body: "Reconstructs the selected area" },
    { n: "5", title: "Final Result", body: "Butterfly removed" },
  ];
  return (
    <section className="space-y-3">
      <h2 className="text-[15px] font-bold tracking-tight">How Circle 2edit Removes an Object</h2>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={s.n}>
            <div
              className={cn(
                "rounded-2xl border px-4 py-3",
                isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white/90",
              )}
            >
              <p className="text-[12px] font-bold text-[#7B6FE0]">
                {s.n}. {s.title}
              </p>
              <p className={cn("mt-0.5 text-[12px]", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
                {s.body}
              </p>
            </div>
            {i < steps.length - 1 ? (
              <div className="flex justify-center py-1">
                <span className="text-[#7B6FE0]">↓</span>
              </div>
            ) : null}
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
  const src = useMemo(() => resolveCircleSampleMediaUrl(sample), [sample]);
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
          {sample.objectLabel ? (
            <span className={cn("text-[11px] font-medium", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
              Object: {sample.objectLabel}
            </span>
          ) : null}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{sample.title}</h1>
        <p className={cn("text-[14px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
          {sample.description}
        </p>
      </section>

      {/* Three stages of the SAME scene */}
      <section className="space-y-4">
        <h2 className="text-[15px] font-bold tracking-tight">Visual demonstration</h2>
        <StageFrame
          label="1 · Before"
          caption={isRemove ? "Original scene with the object present" : "Environment without the target object"}
          src={src}
          isDark={isDark}
        />
        <div className="flex justify-center">
          <span className="text-[#7B6FE0]">↓</span>
        </div>
        <StageFrame
          label={isRemove ? "2 · Mark" : "2 · Outline"}
          caption={
            isRemove
              ? "Same photo · purple circular selection · translucent shade"
              : "Explanatory black outline of the selected object"
          }
          src={src}
          showMark
          isDark={isDark}
        />
        {isRemove ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="flex items-center gap-6">
              {["Analyse", "Removing", "Generating"].map((lab) => (
                <div key={lab} className="flex flex-col items-center gap-1.5">
                  <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#7B6FE0] bg-[rgba(123,111,224,0.15)]">
                    <span className="h-2 w-2 rounded-full bg-[#7B6FE0]" />
                  </span>
                  <span className="text-[10px] font-semibold text-[#7B6FE0]">{lab}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="text-[#7B6FE0]">↓</span>
          </div>
        )}
        <StageFrame
          label="3 · After"
          caption={
            isRemove
              ? "Same composition · object completely removed"
              : "Same environment · selected object realistically added"
          }
          src={src}
          isDark={isDark}
        />
      </section>

      {isRemove ? <RemoveBlockDiagram isDark={isDark} /> : null}

      {/* Technical details from registry — no prompt exposure */}
      <section
        className={cn(
          "rounded-2xl border p-4",
          isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white/90",
        )}
      >
        <h2 className="mb-3 text-[14px] font-bold tracking-tight">Sample details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Object</dt>
            <dd className="font-semibold">{sample.objectLabel ?? sample.title}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Action</dt>
            <dd className="font-semibold">{isRemove ? "Remove" : "Add"}</dd>
          </div>
          {sample.quality ? (
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Quality</dt>
              <dd className="font-semibold">{sample.quality}</dd>
            </div>
          ) : null}
          {sample.aspectRatio ? (
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Aspect ratio</dt>
              <dd className="font-semibold">{sample.aspectRatio}</dd>
            </div>
          ) : null}
          {sample.generationMode ? (
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Generation mode</dt>
              <dd className="font-semibold">{sample.generationMode}</dd>
            </div>
          ) : null}
          {sample.buildDuration ? (
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Build duration</dt>
              <dd className="font-semibold">{sample.buildDuration}</dd>
            </div>
          ) : null}
          <div className="col-span-2">
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>AI operation</dt>
            <dd className="font-semibold">
              {isRemove ? "Object removal / generative reconstruction" : "Object insertion / scene match"}
            </dd>
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

      <section className="space-y-2">
        <h2 className="text-[15px] font-bold tracking-tight">How to use this feature</h2>
        <ol className={cn("list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
          {isRemove ? (
            <>
              <li>Upload a photo</li>
              <li>Circle or paint the object to remove</li>
              <li>Generate — AI fills the region naturally</li>
            </>
          ) : (
            <>
              <li>Upload a photo</li>
              <li>Select the object (or use this preset)</li>
              <li>Paint the placement region</li>
              <li>Confirm — AI integrates the object</li>
            </>
          )}
        </ol>
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
        <Link
          to="/"
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl border",
            isDark ? "border-white/10" : "border-black/8",
          )}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
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
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border-[6px] border-[#7B6FE0]/40" />
            <div className="pointer-events-none absolute right-6 top-10 h-16 w-16 rounded-full border-[3px] border-[#7B6FE0]/55" />
            <div className="pointer-events-none absolute right-10 top-14 h-4 w-4 rounded-full bg-[#7B6FE0]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7B6FE0]">Circle 2edit</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Mark. Remove. Add.
            </h1>
            <p className={cn("mt-2 max-w-md text-[14px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
              Draw a region, then let AI erase or insert objects that match lighting, perspective, and
              shadows of your photo — not stickers.
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
            {!user && (
              <p className={cn("mt-2 text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
                Sign in required before the editor opens.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-[15px] font-bold tracking-tight">Workflow</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Circle, label: "Mark", body: "A→B · Brush · Eraser" },
                { icon: Layers, label: "Choose", body: "Remove or Add object" },
                { icon: Sparkles, label: "Generate", body: "Lighting-matched result" },
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
                  <p className={cn("mt-0.5 text-[10px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-[15px] font-bold tracking-tight">Remove</h2>
            <ol className={cn("list-decimal space-y-1 pl-5 text-[13px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
              <li>Upload a photo</li>
              <li>Circle or paint the unwanted object</li>
              <li>Refine with Brush / Eraser</li>
              <li>Tap Remove Object</li>
              <li>Compare before / after</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-[15px] font-bold tracking-tight">Add</h2>
            <ol className={cn("list-decimal space-y-1 pl-5 text-[13px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
              <li>Select an object from the curated set</li>
              <li>Choose factors (breed, color, pose…)</li>
              <li>Paint the placement region</li>
              <li>Confirm — AI integrates the object</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-[15px] font-bold tracking-tight">Marking tools</h2>
            <ul className="space-y-2 text-[13px]">
              <li className="flex gap-2">
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[#7B6FE0]" />
                <span>
                  <strong>Circle (A→B)</strong> — freehand outline; snaps closed when endpoints meet.
                </span>
              </li>
              <li className="flex gap-2">
                <Brush className="mt-0.5 h-4 w-4 shrink-0 text-[#7B6FE0]" />
                <span>
                  <strong>Brush</strong> — paint precise mask regions.
                </span>
              </li>
              <li className="flex gap-2">
                <Eraser className="mt-0.5 h-4 w-4 shrink-0 text-[#7B6FE0]" />
                <span>
                  <strong>Eraser</strong> — correct the mask without restarting.
                </span>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-[15px] font-bold tracking-tight">FAQ</h2>
            <div className="space-y-2">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className={cn(
                    "group rounded-2xl border px-4 py-3",
                    isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-white/90",
                  )}
                >
                  <summary className="cursor-pointer list-none text-[13px] font-semibold marker:content-none">
                    {item.q}
                  </summary>
                  <p className={cn("mt-2 text-[12px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={start}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7B6FE0] px-5 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[rgba(123,111,224,0.35)] transition active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            {user ? "Try Now" : "Start Now"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
