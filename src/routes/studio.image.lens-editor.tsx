import { createFileRoute } from "@tanstack/react-router";
import { ALL_LENSES, listLensSpecialties } from "@/lib/filter-lens/lenses/lens-registry";
import { EffectStudioPage, lensToCatalogItem } from "@/components/filter-lens/EffectStudioPage";

type Search = { effect?: string };

export const Route = createFileRoute("/studio/image/lens-editor")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): Search => ({
    effect: typeof search.effect === "string" ? search.effect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Lens Editor — Motio2edit" },
      {
        name: "description",
        content: "Apply Motio2edit AI Lenses to your photo. Upload or camera, intensity, undo/redo.",
      },
    ],
  }),
  component: LensEditorPage,
});

function LensEditorPage() {
  const { effect } = Route.useSearch();
  const items = ALL_LENSES.map(lensToCatalogItem);
  const categories = listLensSpecialties();
  return (
    <EffectStudioPage
      kind="lens"
      pageMode="edit"
      title="AI Lenses"
      subtitle="Lens Editor"
      items={items}
      categories={categories}
      initialSelectedId={effect ?? null}
    />
  );
}
