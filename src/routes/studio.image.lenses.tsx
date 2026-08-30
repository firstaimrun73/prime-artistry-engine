import { createFileRoute } from "@tanstack/react-router";
import { ALL_LENSES, listLensSpecialties } from "@/lib/filter-lens/lenses/lens-registry";
import { EffectStudioPage, lensToCatalogItem } from "@/components/filter-lens/EffectStudioPage";

export const Route = createFileRoute("/studio/image/lenses")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AI Lenses — Motio2edit Image Studio" },
      {
        name: "description",
        content:
          "20 original Motio2edit AI Lenses — computational photography transforms for your photos.",
      },
    ],
  }),
  component: LensesPage,
});

function LensesPage() {
  const items = ALL_LENSES.map(lensToCatalogItem);
  const categories = listLensSpecialties();
  return (
    <EffectStudioPage
      kind="lens"
      title="AI Lenses"
      subtitle={`${ALL_LENSES.length} original Motio2edit lenses · specialty processing`}
      items={items}
      categories={categories}
    />
  );
}
