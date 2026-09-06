import { createFileRoute } from "@tanstack/react-router";
import { LensEditor } from "@/components/lens-camera/LensEditor";

type Search = { lens?: string };

export const Route = createFileRoute("/studio/image/lens-editor")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): Search => ({
    lens: typeof search.lens === "string" ? search.lens : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Lens Editor — Motio2edit" },
      {
        name: "description",
        content:
          "Motio2edit Lens Editor — premium camera lenses. Capture with optical treatments powered by Motion2AI camera software.",
      },
    ],
  }),
  component: LensEditorRoute,
});

function LensEditorRoute() {
  const { lens } = Route.useSearch();
  return <LensEditor initialLensId={lens ?? null} />;
}
