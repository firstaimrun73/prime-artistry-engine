/** 3D visuals for MORE_ADD_ASSETS — merged via ExtraAssetVisual. */
import type { ReactNode } from "react";

export function MoreAssetVisual({ id }: { id: string }): ReactNode | null {
  switch (id) {
    case "obj_balloon":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="32" cy="26" rx="14" ry="16" fill="#E05050" />
          <ellipse cx="28" cy="20" rx="4" ry="5" fill="#F08080" opacity="0.5" />
          <path d="M32 42v14" stroke="#8A90A0" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M28 42c2 2 6 2 8 0" fill="#C04040" />
        </g>
      );
    case "obj_tripod":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="32" cy="14" r="5" fill="#3A3E4C" />
          <path d="M32 18L18 52 M32 18L32 52 M32 18L46 52" stroke="#5C6170" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="14" r="2" fill="#8A90A0" />
        </g>
      );
    case "obj_tv":
      return (
        <g filter="url(#c2shadow)">
          <rect x="8" y="14" width="48" height="32" rx="2" fill="#2A2A32" />
          <rect x="12" y="18" width="40" height="24" rx="1" fill="#5B8DEF" opacity="0.4" />
          <path d="M24 46h16v4H24z" fill="#3A3E4C" />
          <ellipse cx="32" cy="52" rx="12" ry="2" fill="#5C6170" />
        </g>
      );
    case "obj_wallet":
      return (
        <g filter="url(#c2shadow)">
          <rect x="10" y="22" width="44" height="28" rx="3" fill="#5C4A32" />
          <path d="M10 30h44" stroke="#8B6914" strokeWidth="1.5" />
          <rect x="14" y="34" width="16" height="10" rx="1" fill="#A07830" />
        </g>
      );
    case "obj_key":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="20" cy="24" r="10" fill="none" stroke="#C8C4E8" strokeWidth="3" />
          <circle cx="20" cy="24" r="4" fill="#3A3E4C" />
          <path d="M28 24h28v4H40v6h-4v-6h-4v8h-4z" fill="#C8C4E8" />
        </g>
      );
    case "obj_laptop":
      return (
        <g filter="url(#c2shadow)">
          <path d="M12 16h40v28H12z" fill="#3A3E4C" />
          <rect x="16" y="20" width="32" height="20" rx="1" fill="#5B8DEF" opacity="0.35" />
          <path d="M8 44h48l-4 6H12z" fill="#2A2A32" />
        </g>
      );
    case "obj_speaker":
      return (
        <g filter="url(#c2shadow)">
          <rect x="16" y="12" width="32" height="44" rx="4" fill="#2A2A32" />
          <circle cx="32" cy="32" r="12" fill="#3A3E4C" stroke="#8A90A0" strokeWidth="2" />
          <circle cx="32" cy="32" r="5" fill="#5C6170" />
        </g>
      );
    case "obj_microphone":
      return (
        <g filter="url(#c2shadow)">
          <rect x="24" y="8" width="16" height="24" rx="8" fill="#8A90A0" />
          <path d="M20 28c0 8 5 14 12 14s12-6 12-14" fill="none" stroke="#5C6170" strokeWidth="2.5" />
          <path d="M32 42v10" stroke="#5C6170" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="32" cy="54" rx="10" ry="3" fill="#3A3E4C" />
        </g>
      );
    case "obj_tablet":
      return (
        <g filter="url(#c2shadow)">
          <rect x="14" y="8" width="36" height="48" rx="3" fill="#2A2A32" />
          <rect x="18" y="12" width="28" height="38" rx="1" fill="#5B8DEF" opacity="0.35" />
          <circle cx="32" cy="52" r="1.5" fill="#8A90A0" />
        </g>
      );
    case "obj_tennis_racket":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="32" cy="22" rx="14" ry="16" fill="none" stroke="#3D9B5F" strokeWidth="3" />
          <path d="M24 14h16 M28 22h8 M24 30h16 M32 10v24" stroke="#A0D0B0" strokeWidth="1" />
          <path d="M32 38v18" stroke="#8B6914" strokeWidth="3.5" strokeLinecap="round" />
          <rect x="28" y="52" width="8" height="8" rx="1" fill="#5C4A32" />
        </g>
      );
    case "obj_basketball":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="32" cy="32" r="18" fill="#E87830" />
          <path d="M32 14v36 M14 32h36 M20 20c8 8 16 8 24 0 M20 44c8-8 16-8 24 0" fill="none" stroke="#2A2A32" strokeWidth="1.5" />
        </g>
      );
    case "obj_pillow":
      return (
        <g filter="url(#c2shadow)">
          <rect x="10" y="20" width="44" height="28" rx="8" fill="#F2F0EA" />
          <rect x="14" y="24" width="36" height="20" rx="6" fill="#E8E0D0" />
        </g>
      );
    case "obj_skateboard":
      return (
        <g filter="url(#c2shadow)">
          <path d="M8 30h48c2 0 4 2 4 4s-2 4-4 4H8c-2 0-4-2-4-4s2-4 4-4z" fill="#5B8DEF" />
          <circle cx="16" cy="42" r="5" fill="#2A2A32" />
          <circle cx="48" cy="42" r="5" fill="#2A2A32" />
          <circle cx="16" cy="42" r="2" fill="#8A90A0" />
          <circle cx="48" cy="42" r="2" fill="#8A90A0" />
        </g>
      );
    case "obj_helmet":
      return (
        <g filter="url(#c2shadow)">
          <path d="M12 36c0-14 9-24 20-24s20 10 20 24v4H12v-4z" fill="#5B8DEF" />
          <path d="M12 36h40v6c0 2-2 4-4 4H16c-2 0-4-2-4-4v-6z" fill="#3D7AB0" />
          <path d="M22 20v8 M32 16v10 M42 20v8" stroke="#3D7AB0" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "obj_water_bottle":
      return (
        <g filter="url(#c2shadow)">
          <rect x="24" y="8" width="16" height="6" rx="1" fill="#5C6170" />
          <path d="M22 14h20l2 6v30c0 4-4 6-12 6s-12-2-12-6V20z" fill="#5B8DEF" opacity="0.85" />
          <path d="M24 28h16" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
        </g>
      );
    case "obj_bouquet":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="24" cy="20" r="8" fill="#E05050" />
          <circle cx="40" cy="18" r="8" fill="#F4A0C0" />
          <circle cx="32" cy="26" r="8" fill="#F0C040" />
          <circle cx="28" cy="14" r="5" fill="#FFFFFF" />
          <path d="M30 32l-4 24 M34 32l4 24 M32 32v24" stroke="#4A9B5A" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 48h20l-2 8H24z" fill="#E05050" opacity="0.7" />
        </g>
      );
    case "obj_plant_pot":
      return (
        <g filter="url(#c2shadow)">
          <path d="M18 28h28l-4 28H22z" fill="#C8955A" />
          <ellipse cx="32" cy="28" rx="16" ry="5" fill="#A07830" />
          <ellipse cx="32" cy="28" rx="12" ry="3" fill="#5C4A32" />
        </g>
      );
    case "obj_candle":
      return (
        <g filter="url(#c2shadow)">
          <rect x="24" y="28" width="16" height="26" rx="2" fill="#F2F0EA" />
          <path d="M32 28v-6" stroke="#8A90A0" strokeWidth="1.5" />
          <ellipse cx="32" cy="18" rx="4" ry="6" fill="#F0C040" />
          <ellipse cx="32" cy="16" rx="2" ry="3" fill="#F08040" />
        </g>
      );
    case "obj_mirror":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="32" cy="28" rx="18" ry="22" fill="#C8C4E8" stroke="#8A90A0" strokeWidth="3" />
          <ellipse cx="32" cy="28" rx="14" ry="18" fill="#B8D4FF" opacity="0.5" />
          <path d="M28 50v8h8v-8" stroke="#8A90A0" strokeWidth="2" />
        </g>
      );
    case "obj_table":
      return (
        <g filter="url(#c2shadow)">
          <rect x="8" y="22" width="48" height="8" rx="1" fill="#C8955A" />
          <path d="M14 30v22 M50 30v22 M22 30v14h20" stroke="#8B6914" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}
