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
      { title: "Lens — Motio2edit" },
      {
        name: "description",
        content:
          "Motio2edit Lens — apply optical treatments to your photos. Free on-device lenses.",
      },
    ],
  }),
  component: LensEditorRoute,
});

function LensEditorRoute() {
  const { lens } = Route.useSearch();
  return <LensEditor initialLensId={lens ?? null} />;
}
