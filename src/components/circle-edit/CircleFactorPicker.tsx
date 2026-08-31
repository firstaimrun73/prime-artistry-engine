/**
 * Asset-aware factor UI for Circle Add.
 * Only shows factors defined on the selected asset. No emoji.
 */
import { cn } from "@/lib/utils";
import type { CircleAddAsset } from "@/lib/circle-edit/add-assets";

type Props = {
  asset: CircleAddAsset;
  selection: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  isDark: boolean;
};

export function CircleFactorPicker({ asset, selection, onChange, isDark }: Props) {
  const factors = asset.factors ?? [];
  if (factors.length === 0) return null;

  return (
    <div className="flex max-h-36 flex-col gap-2 overflow-y-auto">
      {factors.map((factor) => (
        <div key={factor.id}>
          <p className={cn("mb-1 text-[10px] font-semibold uppercase tracking-wide", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
            {factor.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {factor.options.map((opt) => {
              const active = selection[factor.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...selection,
                      [factor.id]: active ? "" : opt.id,
                    })
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    active
                      ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.18)] text-[#7B6FE0]"
                      : isDark
                        ? "border-white/10 text-[#9AA0B0]"
                        : "border-black/8 text-[#5C6170]",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {asset.motionModes && asset.motionModes.length > 1 ? (
        <div>
          <p className={cn("mb-1 text-[10px] font-semibold uppercase tracking-wide", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
            Motion2AI
          </p>
          <div className="flex flex-wrap gap-1.5">
            {asset.motionModes.map((m) => {
              const active = selection["motion2ai"] === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...selection,
                      motion2ai: active ? "" : m,
                    })
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    active
                      ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.18)] text-[#7B6FE0]"
                      : isDark
                        ? "border-white/10 text-[#9AA0B0]"
                        : "border-black/8 text-[#5C6170]",
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <p className={cn("mt-1 text-[9px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
            Pose / action metadata for still-image generation — not video.
          </p>
        </div>
      ) : null}
    </div>
  );
}
