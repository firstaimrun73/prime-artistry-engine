/**
 * Circle 2edit information page — explains product before entering the editor.
 * Route: /studio/image/circle-info
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import removalBefore from "@/assets/sample-removal-before.jpg";
import removalAfter from "@/assets/sample-removal-after.jpg";
import objectBefore from "@/assets/sample-object-before.jpg";
import objectAfter from "@/assets/sample-object-after.jpg";

export const Route = createFileRoute("/studio/image/circle-info")({
  ssr: false,
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

function Section({
  title,
  children,
  isDark,
}: {
  title: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
      <div className={cn("text-[13px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
        {children}
      </div>
    </section>
  );
}

function BeforeAfter({
  before,
  after,
  caption,
  isDark,
}: {
  before: string;
  after: string;
  caption: string;
  isDark: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <figure className="overflow-hidden rounded-xl border border-black/8 dark:border-white/10">
          <img src={before} alt="Before" className="aspect-video w-full object-cover" />
          <figcaption
            className={cn(
              "px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide",
              isDark ? "bg-white/5 text-[#9AA0B0]" : "bg-black/[0.03] text-[#5C6170]",
            )}
          >
            Before
          </figcaption>
        </figure>
        <figure className="overflow-hidden rounded-xl border border-black/8 dark:border-white/10">
          <img src={after} alt="After" className="aspect-video w-full object-cover" />
          <figcaption
            className={cn(
              "px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide",
              isDark ? "bg-white/5 text-[#9AA0B0]" : "bg-black/[0.03] text-[#5C6170]",
            )}
          >
            After
          </figcaption>
        </figure>
      </div>
      <p className={cn("text-center text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
        {caption}
      </p>
    </div>
  );
}

function Circle2editInfoPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "min-h-[100dvh] pb-24",
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
            powered by Motion2AI
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
        <Section title="What is Circle 2edit?" isDark={isDark}>
          <p>
            Circle 2edit lets you mark an unwanted or desired area of a photo and use AI to remove or
            add objects naturally — matching lighting, perspective, scale, and shadows of the original
            scene.
          </p>
        </Section>

        <Section title="Remove" isDark={isDark}>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Upload a photo</li>
            <li>Circle or paint the unwanted object (A→B freehand, Brush, Eraser)</li>
            <li>Refine the mask</li>
            <li>Tap Remove Object</li>
            <li>Compare before / after</li>
          </ol>
          <div className="mt-3">
            <BeforeAfter
              before={removalBefore}
              after={removalAfter}
              caption="Upload → Mark → Remove"
              isDark={isDark}
            />
          </div>
        </Section>

        <Section title="Add" isDark={isDark}>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Select an object from the curated set</li>
            <li>Choose factors (breed, color, pose, finish…)</li>
            <li>Paint the target placement area</li>
            <li>Confirm and let AI integrate the object</li>
          </ol>
          <div className="mt-3">
            <BeforeAfter
              before={objectBefore}
              after={objectAfter}
              caption="Select → Paint → Add"
              isDark={isDark}
            />
          </div>
        </Section>

        <Section title="Marking tools" isDark={isDark}>
          <ul className="space-y-2">
            <li>
              <strong>Circle (A→B)</strong> — Draw a freehand outline from terminal A to B. When B
              nears A, the path snaps closed and fills the selection.
            </li>
            <li>
              <strong>Brush</strong> — Paint precise mask regions for complex shapes.
            </li>
            <li>
              <strong>Eraser</strong> — Correct the mask without restarting.
            </li>
          </ul>
        </Section>

        <Section title="Object factors" isDark={isDark}>
          <p>
            Factors refine how the object appears: breed, color, pose, body type, finish, style, and
            more — resolved server-side so prompts stay safe and consistent.
          </p>
        </Section>

        <Section title="Scene integration" isDark={isDark}>
          <p>
            Circle Add matches camera angle, lighting direction, color temperature, scale, contact
            shadows, depth of field, and edge blending so the result looks photographed in the scene —
            not pasted on.
          </p>
        </Section>

        <Section title="Mobile" isDark={isDark}>
          <p>
            The editor is built for touch: full-height stage, glass controls, safe-area padding, and
            bottom nav hidden while you work.
          </p>
        </Section>

        <Link
          to="/studio/image/circle-remove"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7B6FE0] px-5 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[rgba(123,111,224,0.35)] transition active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" />
          Open Circle 2edit
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
