/**
 * Docks Creative Strength slider immediately above the Image Studio prompt bar.
 * Fixed overlay for /editor only — does not affect Video/Music studios.
 * UI-only control; never wired to generation payloads.
 */
import { useRouterState } from "@tanstack/react-router";
import { CreativeStrengthSlider } from "@/components/editor/image/CreativeStrengthSlider";

export function ImageStudioStrengthDock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onImageEditor = pathname === "/editor" || pathname.startsWith("/editor/");
  if (!onImageEditor) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[35] flex justify-center px-3"
      style={{
        /* Sit just above bottom composer (textarea + generate ~120–160px) + safe area */
        bottom: "calc(7.5rem + env(safe-area-inset-bottom, 0px))",
      }}
      data-ui-only="creative-strength-dock"
    >
      <div className="pointer-events-auto w-full max-w-xl md:bottom-auto">
        <CreativeStrengthSlider className="shadow-md" />
      </div>
    </div>
  );
}
