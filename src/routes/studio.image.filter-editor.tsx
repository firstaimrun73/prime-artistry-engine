import { createFileRoute } from "@tanstack/react-router";
import { ALL_FILTERS, listFilterCategories } from "@/lib/filter-lens/filters/filter-registry";
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
        content: "Apply Motio2edit photographic filters to your photo. Upload or camera, intensity, undo/redo.",
      },
    ],
  }),
  component: FilterEditorPage,
});

function FilterEditorPage() {
  const { effect } = Route.useSearch();
  const items = ALL_FILTERS.map(filterToCatalogItem);
  const categories = listFilterCategories();
  return (
    <EffectStudioPage
      kind="filter"
      pageMode="edit"
      title="Filters"
      subtitle="Filter Editor"
      items={items}
      categories={categories}
      initialSelectedId={effect ?? null}
    />
  );
}
