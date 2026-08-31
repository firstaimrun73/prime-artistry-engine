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
        content:
          "Browse 100 original Motio2edit photographic filters — search, categories, and free/premium catalog.",
      },
    ],
  }),
  component: FiltersDiscoveryPage,
});

function FiltersDiscoveryPage() {
  const items = ALL_FILTERS.map(filterToCatalogItem);
  const categories = listFilterCategories();
  return (
    <EffectStudioPage
      kind="filter"
      pageMode="discover"
      title="Filters"
      subtitle={`${ALL_FILTERS.length} original Motio2edit filters · first 10 free`}
      items={items}
      categories={categories}
    />
  );
}
