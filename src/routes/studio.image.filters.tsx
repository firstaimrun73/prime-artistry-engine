import { createFileRoute } from "@tanstack/react-router";
import { ALL_FILTERS, listFilterCategories } from "@/lib/filter-lens/filters/filter-registry";
import { EffectStudioPage, filterToCatalogItem } from "@/components/filter-lens/EffectStudioPage";

export const Route = createFileRoute("/studio/image/filters")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Filters — Motio2edit Image Studio" },
      {
        name: "description",
        content: "100 original Motio2edit photographic filters — programmatic, deterministic image processing.",
      },
    ],
  }),
  component: FiltersPage,
});

function FiltersPage() {
  const items = ALL_FILTERS.map(filterToCatalogItem);
  const categories = listFilterCategories();
  return (
    <EffectStudioPage
      kind="filter"
      title="Filters"
      subtitle={`${ALL_FILTERS.length} original Motio2edit filters · first 10 free`}
      items={items}
      categories={categories}
    />
  );
}
