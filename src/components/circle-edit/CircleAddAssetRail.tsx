/**
 * Compact horizontal asset rail for Circle Add.
 * Opens only when parent sets open=true after explicit user action.
 * Does not auto-open on page load.
 */
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ADD_ASSET_CATEGORIES,
  searchAddAssets,
  type CircleAddAsset,
} from "@/lib/circle-edit/add-assets";

type Props = {
  isDark: boolean;
  open: boolean;
  onClose: () => void;
  addObjectId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

function AssetThumb({ asset, selected, isDark }: { asset: CircleAddAsset; selected: boolean; isDark: boolean }) {
  return (
    <span
      className={cn(
        "grid h-12 w-12 place-items-center rounded-[12px] border",
        selected
          ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.14)]"
          : isDark
            ? "border-white/10 bg-white/5"
            : "border-black/8 bg-[#F4F5F8]",
      )}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={asset.iconPath} className={selected ? "text-[#7B6FE0]" : isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]"} />
      </svg>
    </span>
  );
}

export function CircleAddAssetRail({
  isDark,
  open,
  onClose,
  addObjectId,
  onSelect,
  disabled,
}: Props) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const assets = useMemo(() => searchAddAssets(query, cat), [query, cat]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "shrink-0 border-t px-3 py-2.5 sm:px-4",
        isDark ? "border-white/8 bg-[#181A22]" : "border-black/6 bg-white",
      )}
      data-circle-add-rail="true"
    >
      <div className="mb-2 flex items-center gap-2">
        <p className={cn("text-[12px] font-semibold", isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]")}>
          Choose object
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search objects…"
          disabled={disabled}
          className={cn(
            "min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-[12px] outline-none focus:border-[#7B6FE0]",
            isDark
              ? "border-white/10 bg-white/5 text-[#F2F2F5] placeholder:text-[#6B7080]"
              : "border-black/10 bg-[#F4F5F8] text-[#1A1C24] placeholder:text-[#8A90A0]",
          )}
        />
        <button
          type="button"
          onClick={onClose}
          className={cn("text-[11px] font-medium", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}
        >
          Close
        </button>
      </div>

      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCat(null)}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium",
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
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium",
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

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {assets.map((asset) => {
          const selected = addObjectId === asset.id;
          return (
            <button
              key={asset.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(asset.id)}
              className="flex w-[72px] shrink-0 flex-col items-center gap-1"
            >
              <AssetThumb asset={asset} selected={selected} isDark={isDark} />
              <span
                className={cn(
                  "w-full truncate text-center text-[10px]",
                  selected ? "text-[#7B6FE0]" : isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
                )}
              >
                {asset.name}
              </span>
              <span className={cn("text-[9px] tabular-nums font-medium", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
                {asset.isFree || asset.creditCost === 0 ? "FREE" : `${asset.creditCost} cr`}
              </span>
            </button>
          );
        })}
        {assets.length === 0 ? (
          <p className={cn("py-3 text-[12px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            No objects match “{query}”.
          </p>
        ) : null}
      </div>
    </div>
  );
}
