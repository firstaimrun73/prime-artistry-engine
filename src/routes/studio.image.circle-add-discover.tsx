/**
 * Circle Add asset discovery — separate from the editor canvas.
 * Route: /studio/image/circle-add-discover
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import {
  ADD_ASSET_CATEGORIES,
  searchAddAssets,
  type CircleAddAsset,
} from "@/lib/circle-edit/add-assets";
import { AssetIcon } from "@/components/circle-edit/AssetIcon";

export const Route = createFileRoute("/studio/image/circle-add-discover")({
  ssr: false,
  component: CircleAddDiscoverPage,
  head: () => ({
    meta: [
      { title: "Circle Add objects — Motio2edit" },
      { name: "description", content: "Browse Circle 2edit objects and factors." },
    ],
  }),
});

function CircleAddDiscoverPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [active, setActive] = useState<CircleAddAsset | null>(null);

  const assets = useMemo(() => searchAddAssets(query, cat), [query, cat]);

  return (
    <div
      className={cn(
        "min-h-[100dvh] pb-16",
        isDark ? "bg-[#12141A] text-[#F2F2F5]" : "bg-[#F4F5F8] text-[#1A1C24]",
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-xl",
          isDark ? "border-white/8 bg-[#181A22]/85" : "border-black/6 bg-white/80",
        )}
      >
        <Link
          to="/studio/image/circle-remove"
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl border",
            isDark ? "border-white/10" : "border-black/8",
          )}
          aria-label="Back to Circle 2edit"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">Circle Add · Objects</p>
          <p className={cn("text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            {assets.length} curated objects
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur-md",
            isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-white/70",
          )}
        >
          <Search className="h-4 w-4 opacity-50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search objects…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCat(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium",
              cat === null
                ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.18)] text-[#7B6FE0]"
                : isDark
                  ? "border-white/10 text-[#9AA0B0]"
                  : "border-black/8 text-[#5C6170]",
            )}
          >
            All
          </button>
          {ADD_ASSET_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium",
                cat === c.id
                  ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.18)] text-[#7B6FE0]"
                  : isDark
                    ? "border-white/10 text-[#9AA0B0]"
                    : "border-black/8 text-[#5C6170]",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => setActive(asset)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3 backdrop-blur-md transition-colors",
                active?.id === asset.id
                  ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.12)]"
                  : isDark
                    ? "border-white/10 bg-white/5"
                    : "border-black/8 bg-white/60",
              )}
            >
              <AssetIcon asset={asset} size={36} isDark={isDark} />
              <span className="w-full truncate text-center text-[11px] font-medium">{asset.name}</span>
              <span className={cn("text-[9px] tabular-nums", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
                {asset.isFree || asset.creditCost === 0 ? "Free" : `${asset.creditCost} cr`}
              </span>
              {asset.motionCapable ? (
                <span className="text-[8px] font-semibold uppercase tracking-wide text-[#7B6FE0]">Motion2AI</span>
              ) : null}
            </button>
          ))}
        </div>

        {active ? (
          <div
            className={cn(
              "rounded-2xl border p-4 backdrop-blur-xl",
              isDark ? "border-white/10 bg-[#181A22]/90" : "border-black/8 bg-white/90",
            )}
          >
            <div className="mb-3 flex items-center gap-3">
              <AssetIcon asset={active} size={40} isDark={isDark} />
              <div>
                <p className="font-semibold">{active.name}</p>
                <p className={cn("text-[12px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
                  {active.categoryLabel}
                  {active.motionCapable ? " · Motion2AI metadata" : ""}
                </p>
              </div>
            </div>
            <p className={cn("mb-3 text-[12px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
              {active.objectSpecificDescription}
            </p>
            {(active.factors ?? []).length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7B6FE0]">Factors</p>
                {(active.factors ?? []).map((f) => (
                  <div key={f.id}>
                    <p className={cn("text-[11px] font-medium", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
                      {f.label}
                    </p>
                    <p className="text-[11px]">{f.options.map((o) => o.label).join(" · ")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={cn("text-[11px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
                No extra factors — base object only.
              </p>
            )}
            <Link
              to="/studio/image/circle-remove"
              search={{ asset: active.id } as never}
              className="mt-4 inline-flex rounded-xl bg-[#7B6FE0] px-4 py-2 text-[12px] font-semibold text-white"
            >
              Use in editor
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
