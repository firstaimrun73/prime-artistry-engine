/** Shared Circle Add asset types — curated registry + expandable. */

export type AssetVariationProfile = {
  enabled: boolean;
  styles: string[];
  colors: string[];
  sceneAdaptation: boolean;
  scaleAdaptation: boolean;
  lightingAdaptation: boolean;
};

export type AssetFactorOption = {
  id: string;
  label: string;
  /** Server-only prompt fragment appended when this option is selected */
  prompt: string;
};

export type AssetFactor = {
  id: string;
  label: string;
  options: AssetFactorOption[];
};

/** Still-image pose/action characterization — not video generation. */
export type Motion2AIMode = "static" | "walking" | "running" | "sitting" | "moving" | "wind" | "flying";

export type CircleAddAsset = {
  id: string;
  name: string;
  slug: string;
  label: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  keywords: string[];
  creditCost: number;
  isFree: boolean;
  isPremium: boolean;
  isActive: boolean;
  sortOrder: number;
  objectSpecificDescription: string;
  generationDescriptor: string;
  backendPrompt: string;
  negativePrompt: string;
  variationProfile: AssetVariationProfile;
  visualType: "svg";
  iconPath: string;
  /** Deprecated — leave empty; UI uses mark/iconPath, never emoji stickers */
  emoji: string;
  mark?: string;
  /** Structured factor hierarchy (server resolves prompts) */
  factors?: AssetFactor[];
  /** Motion2AI metadata for pose/action in still generation */
  motionModes?: Motion2AIMode[];
  motionCapable?: boolean;
};

export type AddAsset = CircleAddAsset;
