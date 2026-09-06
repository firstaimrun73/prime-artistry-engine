import { createFileRoute } from "@tanstack/react-router";
import { LensEditor } from "@/components/lens-camera/LensEditor";

type Search = { lens?: string; image?: string };

export const Route = createFileRoute("/studio/image/lens-editor")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): Search => ({
    lens: typeof search.lens === "string" ? search.lens : undefined,
    image: typeof search.image === "string" ? search.image : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Lens Editor — Motio2edit" },
      {
        name: "description",
        content:
          "Motio2edit Lens Editor — premium camera experience with optical lenses. Capture or choose a photo, pick a lens, apply.",
      },
    ],
  }),
  component: LensEditorRoute,
});

function LensEditorRoute() {
  const { lens, image } = Route.useSearch();
  return <LensEditor initialLensId={lens ?? null} initialImageUrl={image ?? null} />;
}
