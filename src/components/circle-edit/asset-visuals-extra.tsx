/** Extra Circle 2edit filled 3D visuals — used by AssetVisual. */
import type { ReactNode } from "react";

export function ExtraAssetVisual({ id }: { id: string }): ReactNode | null {
  switch (id) {
    case "obj_flower":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="32" cy="28" r="10" fill="#F4A0C0" />
          <circle cx="24" cy="24" r="7" fill="#F8B8D0" />
          <circle cx="40" cy="24" r="7" fill="#F8B8D0" />
          <circle cx="28" cy="34" r="7" fill="#EE90B8" />
          <circle cx="36" cy="34" r="7" fill="#EE90B8" />
          <circle cx="32" cy="28" r="4" fill="#F0D060" />
          <path d="M32 38v14" stroke="#4A9B5A" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case "obj_camera":
      return (
        <g filter="url(#c2shadow)">
          <rect x="10" y="22" width="44" height="28" rx="4" fill="#3A3E4C" />
          <circle cx="32" cy="36" r="10" fill="#1A1C24" stroke="#8A90A0" strokeWidth="2" />
          <circle cx="32" cy="36" r="5" fill="#5B8DEF" opacity="0.5" />
          <rect x="14" y="18" width="12" height="6" rx="1" fill="#5C6170" />
          <circle cx="48" cy="28" r="2" fill="#E05050" />
        </g>
      );
    case "obj_phone":
      return (
        <g filter="url(#c2shadow)">
          <rect x="20" y="8" width="24" height="48" rx="4" fill="#2A2A32" />
          <rect x="23" y="14" width="18" height="34" rx="1" fill="#5B8DEF" opacity="0.35" />
          <circle cx="32" cy="52" r="2" fill="#8A90A0" />
        </g>
      );
    case "obj_watch":
      return (
        <g filter="url(#c2shadow)">
          <rect x="26" y="6" width="12" height="14" rx="2" fill="#8A90A0" />
          <rect x="26" y="44" width="12" height="14" rx="2" fill="#8A90A0" />
          <circle cx="32" cy="32" r="12" fill="#3A3E4C" stroke="#C8C4E8" strokeWidth="2" />
          <circle cx="32" cy="32" r="2" fill="#F2F2F5" />
          <path d="M32 32v-6 M32 32h5" stroke="#F2F2F5" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    case "obj_backpack":
      return (
        <g filter="url(#c2shadow)">
          <path d="M18 20h28v32c0 4-4 6-14 6s-14-2-14-6V20z" fill="#5B8DEF" />
          <path d="M22 14c0-4 4-8 10-8s10 4 10 8" fill="none" stroke="#3D7AB0" strokeWidth="3" />
          <rect x="24" y="28" width="16" height="12" rx="2" fill="#3D7AB0" />
        </g>
      );
    case "obj_chair":
      return (
        <g filter="url(#c2shadow)">
          <rect x="16" y="24" width="32" height="6" rx="1" fill="#A07830" />
          <path d="M18 30v20 M46 30v20 M22 30v12h20" fill="none" stroke="#8B6914" strokeWidth="3" strokeLinecap="round" />
          <rect x="18" y="12" width="28" height="14" rx="2" fill="#C4A06A" />
        </g>
      );
    case "obj_lamp":
      return (
        <g filter="url(#c2shadow)">
          <path d="M20 28h24l-4 14H24z" fill="#F0C040" />
          <rect x="30" y="42" width="4" height="12" fill="#8A90A0" />
          <ellipse cx="32" cy="56" rx="10" ry="3" fill="#5C6170" />
        </g>
      );
    case "obj_plant":
      return (
        <g filter="url(#c2shadow)">
          <path d="M32 8c-6 10-14 14-16 16 8 2 12 8 16 18 4-10 10-16 16-18-2-2-10-6-16-16z" fill="#3D9B5F" />
          <path d="M24 42h16l2 14H22z" fill="#C8955A" />
        </g>
      );
    case "obj_book":
      return (
        <g filter="url(#c2shadow)">
          <path d="M12 14h36v36H12z" fill="#7B6FE0" />
          <path d="M16 14v36" stroke="#C8C4E8" strokeWidth="2" />
          <path d="M20 22h24 M20 28h20" stroke="#A39AE8" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    case "obj_umbrella":
      return (
        <g filter="url(#c2shadow)">
          <path d="M32 14c-14 0-24 10-24 12h48c0-2-10-12-24-12z" fill="#E05050" />
          <path d="M32 26v24" stroke="#5C6170" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 50c4 4 8 2 8-2" fill="none" stroke="#5C6170" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "obj_headphones":
      return (
        <g filter="url(#c2shadow)">
          <path d="M14 34c0-12 8-20 18-20s18 8 18 20" fill="none" stroke="#3A3E4C" strokeWidth="4" />
          <rect x="8" y="32" width="10" height="16" rx="3" fill="#5B8DEF" />
          <rect x="46" y="32" width="10" height="16" rx="3" fill="#5B8DEF" />
        </g>
      );
    case "obj_guitar":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="28" cy="40" rx="14" ry="16" fill="#C8955A" />
          <circle cx="28" cy="40" r="5" fill="#5C4A32" />
          <path d="M34 28l16-20" stroke="#A07830" strokeWidth="3" strokeLinecap="round" />
          <rect x="46" y="4" width="10" height="8" rx="1" fill="#8B6914" />
        </g>
      );
    case "obj_football":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="32" cy="32" r="18" fill="#F2F2F5" stroke="#2A2A32" strokeWidth="1.5" />
          <path d="M32 14v36 M14 32h36 M20 20l24 24 M44 20L20 44" stroke="#2A2A32" strokeWidth="1.2" />
        </g>
      );
    case "obj_teddy":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="20" cy="18" r="7" fill="#C8955A" />
          <circle cx="44" cy="18" r="7" fill="#C8955A" />
          <ellipse cx="32" cy="34" rx="16" ry="18" fill="#D4A574" />
          <circle cx="26" cy="32" r="2" fill="#2A2460" />
          <circle cx="38" cy="32" r="2" fill="#2A2460" />
          <ellipse cx="32" cy="40" rx="3" ry="2" fill="#8B5A2B" />
        </g>
      );
    case "obj_gift":
      return (
        <g filter="url(#c2shadow)">
          <rect x="14" y="24" width="36" height="28" rx="2" fill="#E05050" />
          <rect x="28" y="24" width="8" height="28" fill="#F0C040" />
          <rect x="14" y="34" width="36" height="8" fill="#F0C040" />
          <path d="M24 24c4-8 8-8 12 0 M32 16c4 8 8 8 12 0" fill="none" stroke="#F0C040" strokeWidth="2" />
        </g>
      );
    case "obj_sofa":
      return (
        <g filter="url(#c2shadow)">
          <rect x="8" y="28" width="48" height="18" rx="4" fill="#7B6FE0" />
          <rect x="12" y="20" width="16" height="12" rx="3" fill="#9B93F0" />
          <rect x="36" y="20" width="16" height="12" rx="3" fill="#9B93F0" />
          <path d="M12 46v6 M52 46v6" stroke="#5C54C0" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "obj_travel_bag":
      return (
        <g filter="url(#c2shadow)">
          <path d="M12 24h40v28c0 3-4 5-20 5s-20-2-20-5V24z" fill="#5B8DEF" />
          <path d="M22 18c0-4 4-8 10-8s10 4 10 8" fill="none" stroke="#3D7AB0" strokeWidth="3" />
          <rect x="20" y="32" width="24" height="10" rx="2" fill="#3D7AB0" />
        </g>
      );
    case "food_coffee":
      return (
        <g filter="url(#c2shadow)">
          <path d="M18 22h24l-3 28H21z" fill="#F2F0EA" />
          <path d="M42 28h6c4 0 6 4 4 8s-4 6-8 4" fill="none" stroke="#C8C4E8" strokeWidth="2.5" />
          <ellipse cx="30" cy="22" rx="12" ry="3" fill="#8B5A2B" />
        </g>
      );
    case "food_pizza":
      return (
        <g filter="url(#c2shadow)">
          <path d="M32 10L12 50h40z" fill="#F0C040" />
          <path d="M32 10L12 50h40z" fill="#E05050" opacity="0.25" />
          <circle cx="28" cy="30" r="3" fill="#E05050" />
          <circle cx="36" cy="36" r="2.5" fill="#3D9B5F" />
          <circle cx="30" cy="40" r="2" fill="#E05050" />
        </g>
      );
    case "food_burger":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="32" cy="22" rx="18" ry="6" fill="#E8A040" />
          <rect x="14" y="26" width="36" height="6" rx="1" fill="#3D9B5F" />
          <rect x="14" y="32" width="36" height="8" rx="1" fill="#8B5A2B" />
          <ellipse cx="32" cy="44" rx="18" ry="6" fill="#E8A040" />
        </g>
      );
    case "food_icecream":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="32" cy="22" r="12" fill="#F4A0C0" />
          <path d="M22 28l10 28 10-28" fill="#E8A040" />
        </g>
      );
    case "nature_cloud":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="24" cy="34" rx="12" ry="8" fill="#F2F2F5" />
          <ellipse cx="38" cy="32" rx="14" ry="10" fill="#FFFFFF" />
          <ellipse cx="28" cy="28" rx="10" ry="8" fill="#F2F2F5" />
        </g>
      );
    case "nature_sun":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="32" cy="32" r="12" fill="#F0C040" />
          <path d="M32 8v6 M32 50v6 M8 32h6 M50 32h6 M14 14l4 4 M46 46l4 4 M14 50l4-4 M46 14l4-4" stroke="#F0C040" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case "nature_moon":
      return (
        <g filter="url(#c2shadow)">
          <circle cx="32" cy="32" r="16" fill="#E8E0C8" />
          <circle cx="38" cy="28" r="3" fill="#C8C0A8" opacity="0.6" />
          <circle cx="26" cy="36" r="2" fill="#C8C0A8" opacity="0.5" />
        </g>
      );
    case "animal_panda":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="32" cy="36" rx="16" ry="14" fill="#F2F2F5" />
          <circle cx="18" cy="18" r="7" fill="#2A2A32" />
          <circle cx="46" cy="18" r="7" fill="#2A2A32" />
          <ellipse cx="24" cy="34" rx="5" ry="6" fill="#2A2A32" />
          <ellipse cx="40" cy="34" rx="5" ry="6" fill="#2A2A32" />
          <circle cx="24" cy="34" r="2" fill="#F2F2F5" />
          <circle cx="40" cy="34" r="2" fill="#F2F2F5" />
          <ellipse cx="32" cy="42" rx="3" ry="2" fill="#2A2A32" />
        </g>
      );
    case "animal_penguin":
      return (
        <g filter="url(#c2shadow)">
          <ellipse cx="32" cy="34" rx="14" ry="20" fill="#2A2A32" />
          <ellipse cx="32" cy="38" rx="9" ry="12" fill="#F2F2F5" />
          <circle cx="26" cy="28" r="2" fill="#F2F2F5" />
          <circle cx="38" cy="28" r="2" fill="#F2F2F5" />
          <path d="M30 32l2 3 2-3z" fill="#E07030" />
        </g>
      );
    case "vehicle_truck":
      return (
        <g filter="url(#c2shadow)">
          <rect x="6" y="24" width="28" height="20" rx="2" fill="#5B8DEF" />
          <path d="M34 28h16l4 10v6H34V28z" fill="#3D7AB0" />
          <circle cx="16" cy="48" r="6" fill="#2A2A32" />
          <circle cx="44" cy="48" r="6" fill="#2A2A32" />
        </g>
      );
    case "vehicle_van":
      return (
        <g filter="url(#c2shadow)">
          <path d="M8 22h40l8 14v12H8V22z" fill="#F0C040" />
          <rect x="14" y="26" width="14" height="10" rx="1" fill="#B8D4FF" />
          <circle cx="18" cy="48" r="6" fill="#2A2A32" />
          <circle cx="46" cy="48" r="6" fill="#2A2A32" />
        </g>
      );
    case "costume_male":
      return (
        <g filter="url(#c2shadow)">
          <path d="M20 18h24v8l-4 4v20H24V30l-4-4V18z" fill="#5B8DEF" />
          <path d="M24 18c0-6 4-10 8-10s8 4 8 10" fill="#D4A574" />
          <rect x="26" y="30" width="12" height="20" fill="#3A3E4C" />
        </g>
      );
    case "costume_female":
      return (
        <g filter="url(#c2shadow)">
          <path d="M22 18h20v6l-6 8v18H28V32l-6-8V18z" fill="#E07090" />
          <path d="M24 18c0-6 4-10 8-10s8 4 8 10" fill="#D4A574" />
          <path d="M22 32h20l-4 18H26z" fill="#C05070" />
        </g>
      );
    default:
      return null;
  }
}
