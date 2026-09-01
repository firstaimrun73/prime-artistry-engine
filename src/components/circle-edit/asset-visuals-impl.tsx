/**
 * Premium original 3D-emoji-inspired asset visuals for Circle 2edit.
 * Original artwork — not proprietary emoji copies.
 * viewBox 0 0 64 64. Filled shapes + soft depth. prefers-reduced-motion aware.
 */
import { cn } from "@/lib/utils";
import { ExtraAssetVisual } from "./asset-visuals-extra";

export type AssetAnimKind =
  | "none"
  | "tail"
  | "ear"
  | "wing"
  | "blink"
  | "wheel"
  | "leaf"
  | "neck";

const ANIM: Record<string, AssetAnimKind> = {
  animal_cat: "tail",
  animal_dog: "ear",
  animal_bird: "wing",
  animal_rabbit: "ear",
  animal_owl: "blink",
  animal_fox: "tail",
  animal_squirrel: "tail",
  animal_swan: "neck",
  animal_deer: "ear",
  animal_horse: "tail",
  animal_panda: "ear",
  vehicle_car: "wheel",
  vehicle_motorcycle: "wheel",
  vehicle_bus: "wheel",
  vehicle_scooter: "wheel",
  vehicle_bicycle: "wheel",
  vehicle_truck: "wheel",
  vehicle_van: "wheel",
  nature_tree: "leaf",
  obj_flower: "leaf",
  obj_plant: "leaf",
  nature_cloud: "leaf",
};

export function getAssetAnimKind(id: string): AssetAnimKind {
  return ANIM[id] ?? "none";
}

export const ASSET_ANIM_CSS = `
@keyframes c2-tail { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(8deg)} }
@keyframes c2-ear { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-6deg)} }
@keyframes c2-wing { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(12deg)} }
@keyframes c2-blink { 0%,42%,58%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.15)} }
@keyframes c2-wheel { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
@keyframes c2-leaf { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(3deg)} }
@keyframes c2-neck { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(4deg)} }
@media (prefers-reduced-motion: reduce) {
  .c2-anim * { animation: none !important; }
}
`;

type Props = {
  id: string;
  size?: number;
  selected?: boolean;
  animate?: boolean;
  className?: string;
  title?: string;
};

function Defs() {
  return (
    <defs>
      <filter id="c2shadow" x="-20%" y="-10%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodOpacity="0.22" />
      </filter>
    </defs>
  );
}

function Visual({ id }: { id: string }) {
  switch (id) {
    case "obj_shoe":
      return (
        <g filter="url(#c2shadow)">
          <path d="M8 40c2-8 8-12 18-13h16c6 1 12 5 16 11l2 6H10l-2-4z" fill="#5B4FC7" />
          <path d="M10 44h44c0 2-2 4-5 4H14c-3 0-4-2-4-4z" fill="#3D3590" />
          <path d="M18 30c2-3 5-5 9-5 2 0 4 1 5 3" fill="none" stroke="#C8C4F0" strokeWidth="1.4" strokeLinecap="round" />
          <ellipse cx="22" cy="36" rx="3" ry="1.6" fill="#E8E6FA" opacity="0.7" />
        </g>
      );
    case "obj_vase":
      return (
        <g filter="url(#c2shadow)">
          <path d="M26 8h12l2 6c2 4 6 10 6 18 0 12-5 22-14 24h-2c-9-2-14-12-14-24 0-8 4-14 6-18l2-6z" fill="#7B6FE0" />
          <path d="M28 8h8v4c0 1-1 2-2 2h-4c-1 0-2-1-2-2V8z" fill="#A39AE8" />
          <ellipse cx="32" cy="10" rx="6" ry="2" fill="#D4D0F5" />
        </g>
      );
    case "obj_cake":
      return (
        <g filter="url(#c2shadow)">
          <rect x="14" y="36" width="36" height="16" rx="3" fill="#F4A6C8" />
          <rect x="18" y="26" width="28" height="12" rx="2" fill="#FFE4EC" />
          <rect x="22" y="18" width="20" height="10" rx="2" fill="#FFB7D0" />
          <circle cx="32" cy="14" r="2.5" fill="#FF6B9A" />
          <path d="M32 12v-4" stroke="#FFD166" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case "obj_glasses":
      return (
        <g filter="url(#c2shadow)">
          <rect x="6" y="24" width="22" height="16" rx="5" fill="#4A4568" stroke="#C8C4E8" strokeWidth="1.5" />
          <rect x="36" y="24" width="22" height="16" rx="5" fill="#4A4568" stroke="#C8C4E8" strokeWidth="1.5" />
          <path d="M28 32h8" stroke="#C8C4E8" strokeWidth="2" strokeLinecap="round" />
          <path d="M6 28L2 18" stroke="#C8C4E8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M58 28l4-10" stroke="#C8C4E8" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="17" cy="32" rx="6" ry="5" fill="#9B93F0" opacity="0.35" />
          <ellipse cx="47" cy="32" rx="6" ry="5" fill="#9B93F0" opacity="0.35" />
        </g>
      );
    case "obj_hat":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="32" cy="44" rx="26" ry="7" fill="#5C4A32" />
          <path d="M18 42c2-14 8-22 14-22s12 8 14 22" fill="#7A6240" />
          <ellipse cx="32" cy="22" rx="12" ry="4" fill="#9A7B52" />
        </g>
      );
    case "animal_cat":
      return (
        <g filter="url(#c2shadow)">
          <path d="M20 18l-6-12 10 6" fill="#F0A060" />
          <path d="M44 18l6-12-10 6" fill="#F0A060" />
          <ellipse cx="32" cy="36" rx="16" ry="14" fill="#F4B06A" />
          <circle cx="26" cy="34" r="2.2" fill="#2A2460" />
          <circle cx="38" cy="34" r="2.2" fill="#2A2460" />
          <path d="M30 38c1 2 3 2 4 0" fill="none" stroke="#C87840" strokeWidth="1.2" />
          <path d="M46 38c8 2 12 10 10 16" fill="none" stroke="#E09050" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case "animal_dog":
      return (
        <g filter="url(#c2shadow)">
          <path d="M14 24c-2-8 4-14 10-10 2 1 3 4 3 6" fill="#C8955A" />
          <path d="M42 24c2-8-4-14-10-10-2 1-3 4-3 6" fill="#C8955A" />
          <ellipse cx="32" cy="38" rx="16" ry="14" fill="#D4A574" />
          <ellipse cx="46" cy="36" rx="6" ry="4" fill="#B07A40" />
          <circle cx="26" cy="36" r="2.2" fill="#2A2460" />
          <circle cx="36" cy="36" r="2.2" fill="#2A2460" />
          <ellipse cx="32" cy="42" rx="3" ry="2" fill="#8B5A2B" />
        </g>
      );
    case "animal_deer":
      return (
        <g filter="url(#c2shadow)">
          <path d="M24 8l-4 14 5-2 1 8" fill="none" stroke="#8B6B40" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M40 8l4 14-5-2-1 8" fill="none" stroke="#8B6B40" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="32" cy="36" rx="14" ry="12" fill="#C4A06A" />
          <ellipse cx="32" cy="28" rx="8" ry="7" fill="#D4B07A" />
          <circle cx="28" cy="28" r="1.6" fill="#2A2460" />
          <circle cx="36" cy="28" r="1.6" fill="#2A2460" />
          <path d="M24 44v12 M40 44v12" stroke="#A08050" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "animal_horse":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="30" cy="40" rx="16" ry="12" fill="#8B6914" />
          <path d="M40 28c6-12 14-14 18-6-4 5-10 10-16 12" fill="#A07830" />
          <path d="M22 26c0-6 4-12 8-10" fill="#6B5010" />
          <path d="M16 42c-6 4-8 12-4 16" fill="none" stroke="#5A4010" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="48" cy="22" r="1.8" fill="#2A2460" />
          <path d="M18 48v10 M26 48v10 M38 48v10 M46 48v10" stroke="#6B5010" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case "animal_bird":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="32" cy="36" rx="14" ry="10" fill="#5BA3E0" />
          <path d="M20 34c-6-4-8-10-2-14 2 4 6 8 12 10" fill="#3D7AB0" />
          <path d="M44 34l10-4-2 4z" fill="#E8A040" />
          <circle cx="38" cy="32" r="2" fill="#2A2460" />
          <path d="M28 44v6 M36 44v6" stroke="#3D7AB0" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "animal_rabbit":
      return (
        <g filter="url(#c2shadow)">
          <path d="M24 8c0-2 3-6 5-6s4 4 4 10v14" fill="#E8D0C0" />
          <path d="M36 8c0-2 3-6 5-6s4 4 4 10v14" fill="#E8D0C0" />
          <ellipse cx="32" cy="38" rx="14" ry="12" fill="#F0E0D0" />
          <circle cx="26" cy="36" r="2" fill="#2A2460" />
          <circle cx="38" cy="36" r="2" fill="#2A2460" />
          <ellipse cx="32" cy="42" rx="2.5" ry="1.8" fill="#E09090" />
        </g>
      );
    case "animal_owl":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="32" cy="36" rx="16" ry="18" fill="#8B7355" />
          <circle cx="24" cy="30" r="7" fill="#F5E6C8" />
          <circle cx="40" cy="30" r="7" fill="#F5E6C8" />
          <circle cx="24" cy="30" r="3.5" fill="#2A2460" />
          <circle cx="40" cy="30" r="3.5" fill="#2A2460" />
          <path d="M30 36l2 4 2-4z" fill="#E8A040" />
        </g>
      );
    case "animal_fox":
      return (
        <g filter="url(#c2shadow)">
          <path d="M18 20l-8-12 8 4" fill="#E07030" />
          <path d="M46 20l8-12-8 4" fill="#E07030" />
          <ellipse cx="32" cy="36" rx="15" ry="13" fill="#E87830" />
          <circle cx="26" cy="34" r="2" fill="#2A2460" />
          <circle cx="38" cy="34" r="2" fill="#2A2460" />
          <path d="M46 40c10 4 14 14 8 18H46" fill="#F0A060" />
          <ellipse cx="32" cy="42" rx="3" ry="2" fill="#2A2460" />
        </g>
      );
    case "animal_squirrel":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="28" cy="38" rx="12" ry="11" fill="#C08040" />
          <path d="M38 28c10-14 18-12 20 0-6 8-14 12-20 10" fill="#A06830" />
          <circle cx="24" cy="36" r="1.8" fill="#2A2460" />
          <circle cx="32" cy="36" r="1.8" fill="#2A2460" />
          <ellipse cx="28" cy="42" rx="2" ry="1.5" fill="#8B5030" />
        </g>
      );
    case "animal_swan":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="30" cy="44" rx="18" ry="10" fill="#F2F0EA" />
          <path d="M36 36c4-16 14-20 20-10" fill="none" stroke="#F2F0EA" strokeWidth="5" strokeLinecap="round" />
          <circle cx="54" cy="22" r="4" fill="#F2F0EA" />
          <path d="M56 22l6-1" stroke="#E07030" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="52" cy="21" r="1.2" fill="#2A2460" />
        </g>
      );
    case "vehicle_car":
      return (
        <g filter="url(#c2shadow)">
          <path d="M8 36l8-14h32l8 14v12H8V36z" fill="#5B8DEF" />
          <rect x="16" y="24" width="12" height="10" rx="1" fill="#B8D4FF" />
          <rect x="36" y="24" width="12" height="10" rx="1" fill="#B8D4FF" />
          <circle cx="16" cy="48" r="6" fill="#2A2A32" />
          <circle cx="48" cy="48" r="6" fill="#2A2A32" />
          <circle cx="16" cy="48" r="2.5" fill="#8A90A0" />
          <circle cx="48" cy="48" r="2.5" fill="#8A90A0" />
        </g>
      );
    case "vehicle_motorcycle":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="14" cy="46" r="8" fill="#2A2A32" />
          <circle cx="50" cy="46" r="8" fill="#2A2A32" />
          <path d="M22 40l12-16h8l6 12" fill="none" stroke="#E05050" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M28 28h14" stroke="#C04040" strokeWidth="2.5" />
          <circle cx="14" cy="46" r="3" fill="#8A90A0" />
          <circle cx="50" cy="46" r="3" fill="#8A90A0" />
        </g>
      );
    case "vehicle_bus":
      return (
        <g filter="url(#c2shadow)">
          <rect x="8" y="14" width="48" height="32" rx="4" fill="#F0C040" />
          <rect x="12" y="18" width="10" height="10" rx="1" fill="#B8D4FF" />
          <rect x="26" y="18" width="10" height="10" rx="1" fill="#B8D4FF" />
          <rect x="40" y="18" width="10" height="10" rx="1" fill="#B8D4FF" />
          <circle cx="16" cy="48" r="6" fill="#2A2A32" />
          <circle cx="48" cy="48" r="6" fill="#2A2A32" />
        </g>
      );
    case "vehicle_scooter":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="14" cy="48" r="7" fill="#2A2A32" />
          <circle cx="48" cy="48" r="7" fill="#2A2A32" />
          <path d="M20 42h22l8-14h-6" fill="none" stroke="#5B8DEF" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M42 28v-10" stroke="#2A2A32" strokeWidth="2.5" />
          <path d="M36 18h14" stroke="#2A2A32" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case "vehicle_bicycle":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="14" cy="44" r="9" fill="none" stroke="#2A2A32" strokeWidth="2.5" />
          <circle cx="50" cy="44" r="9" fill="none" stroke="#2A2A32" strokeWidth="2.5" />
          <path d="M14 44l16-18h10l10 18" fill="none" stroke="#E05050" strokeWidth="2.2" />
          <path d="M30 26v18" stroke="#E05050" strokeWidth="2" />
          <path d="M26 26h10" stroke="#2A2A32" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "nature_tree":
      return (
        <g filter="url(#c2shadow)">
          <path d="M32 8c-8 12-20 16-24 18 10 2 18 10 24 22 6-12 16-20 24-22-4-2-16-6-24-18z" fill="#3D9B5F" />
          <path d="M28 46h8v12h-8z" fill="#8B6914" />
        </g>
      );
    default: {
      const extra = ExtraAssetVisual({ id });
      if (extra) return extra;
      return (
        <g>
          <rect x="12" y="12" width="40" height="40" rx="10" fill="#7B6FE0" opacity="0.35" />
          <text x="32" y="38" textAnchor="middle" fill="#7B6FE0" fontSize="10" fontWeight="700">
            {id.slice(0, 3).toUpperCase()}
          </text>
        </g>
      );
    }
  }
}

function animCss(kind: AssetAnimKind, animate: boolean): string | undefined {
  if (!animate || kind === "none") return undefined;
  const map: Record<AssetAnimKind, string> = {
    none: "none",
    tail: "c2-tail 2.4s ease-in-out infinite",
    ear: "c2-ear 2.2s ease-in-out infinite",
    wing: "c2-wing 1.6s ease-in-out infinite",
    blink: "c2-blink 3.2s ease-in-out infinite",
    wheel: "c2-wheel 4s linear infinite",
    leaf: "c2-leaf 3s ease-in-out infinite",
    neck: "c2-neck 2.8s ease-in-out infinite",
  };
  return map[kind];
}

export function AssetVisual({ id, size = 28, selected = false, animate = true, className, title }: Props) {
  const kind = getAssetAnimKind(id);
  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doAnim = animate && !reduced && kind !== "none";
  const animation = animCss(kind, doAnim);

  return (
    <span
      className={cn("inline-flex items-center justify-center c2-anim", className)}
      style={{ width: size, height: size }}
      title={title}
      role="img"
      aria-label={title || id}
    >
      <style>{ASSET_ANIM_CSS}</style>
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={cn(selected && "drop-shadow-sm")}
        style={animation ? { animation } : undefined}
      >
        <Defs />
        <Visual id={id} />
      </svg>
    </span>
  );
}
