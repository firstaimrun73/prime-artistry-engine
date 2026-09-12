/**
 * filters/filter-types.ts
 * Type definitions for Motio2edit filters.
 */
import { ProcessingProfile } from '../shared/processing-types';
import { AttributionMetadata, UnlockMetadata } from '../shared/metadata';

/** Quality / product tier (independent of free/locked access). */
export type FilterTier = 'ai+' | 'pro' | 'premium';

export type FilterCategory =
  | 'Natural' | 'Portrait' | 'Cinematic' | 'Film' | 'Vintage'
  | 'Retro' | 'Black & White' | 'Moody' | 'Warm' | 'Cool'
  | 'Sunset' | 'Night' | 'Street' | 'Travel' | 'Landscape'
  | 'Food' | 'Fashion' | 'Dramatic' | 'Soft' | 'Professional'
  | 'Comic' | 'Sketch' | 'Art' | 'Neon' | 'Atmospheric';

export const FILTER_CATEGORIES: FilterCategory[] = [
  'Natural', 'Portrait', 'Cinematic', 'Film', 'Vintage',
  'Retro', 'Black & White', 'Moody', 'Warm', 'Cool',
  'Sunset', 'Night', 'Street', 'Travel', 'Landscape',
  'Food', 'Fashion', 'Dramatic', 'Soft', 'Professional',
  'Comic', 'Sketch', 'Art', 'Neon', 'Atmospheric',
];

export interface FilterIntensityRange {
  min: number;
  max: number;
  default: number;
}

export interface FilterDefinition {
  id: string;
  name: string;
  category: FilterCategory;
  description: string;
  visualDescription: string;
  icon: string;
  previewKey: string;
  processingProfile: ProcessingProfile;
  intensityRange: FilterIntensityRange;
  supportsPreview: true;
  supportsFullResolution: true;
  supportsCamera: false;
  developerNotes: string;
  attribution: AttributionMetadata;
  unlock: UnlockMetadata;
  /** Explicit quality tier. Free filters may omit or set any tier for visual hierarchy only. */
  tier?: FilterTier | null;
  /** Subtle animated thumb indicator for selected AI+ looks. */
  animatedThumb?: boolean;
}
