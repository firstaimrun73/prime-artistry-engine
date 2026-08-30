/** Shared Circle Add asset types — scalable registry (1000+ ready). */

export type AssetVariationProfile = {
  enabled: boolean;
  styles: string[];
  colors: string[];
  sceneAdaptation: boolean;
  scaleAdaptation: boolean;
  lightingAdaptation: boolean;
};

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
};

export type AddAsset = CircleAddAsset;
