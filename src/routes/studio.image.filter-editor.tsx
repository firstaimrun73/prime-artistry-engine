import { createFileRoute } from "@tanstack/react-router";
import { CATALOG_FILTERS, listFilterCategories } from "@/lib/filter-lens/filters/filter-registry";
import { EffectStudioPage, filterToCatalogItem } from "@/components/filter-lens/EffectStudioPage";

type Search = { effect?: string };

export const Route = createFileRoute("/studio/image/filter-editor")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): Search => ({
    effect: typeof search.effect === "string" ? search.effect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Filter Editor — Motio2edit" },
      {
        name: "description",
        content: "Apply Motio2edit Filters to your photo with live preview and adjustments.",
      },
    ],
  }),
  component: FilterEditorPage,
});

function FilterEditorPage() {
  const { effect } = Route.useSearch();
  // CATALOG_FILTERS = original 100 + 25 Premium (same UI components, premium badge)
  const items = CATALOG_FILTERS.map((f, i) => filterToCatalogItem(f, i));
  const categories = listFilterCategories();
  return (
    <EffectStudioPage
      kind="filter"
      pageMode="edit"
      title="Filters"
      subtitle="100+ AI Filters"
      items={items}
      categories={categories}
      initialSelectedId={effect ?? null}
    />
  );
}
