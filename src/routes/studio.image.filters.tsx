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
          "Motio2edit Filters — 100+ looks with live preview. Natural, Portrait, Cinematic, Film and more.",
      },
    ],
  }),
  component: FiltersDiscoveryPage,
});

function FiltersDiscoveryPage() {
  const items = ALL_FILTERS.map((f, i) => filterToCatalogItem(f, i));
  const categories = listFilterCategories();
  return (
    <EffectStudioPage
      kind="filter"
      pageMode="discover"
      title="Filters"
      subtitle="100+ AI Filters"
      items={items}
      categories={categories}
    />
  );
}
