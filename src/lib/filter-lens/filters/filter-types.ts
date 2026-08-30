/**
 * filters/filter-types.ts
 * Type definitions for Motio2edit filters. Photo-only, programmatic (no generative AI).
 */
import { ProcessingProfile } from '../shared/processing-types';
import { AttributionMetadata, UnlockMetadata } from '../shared/metadata';

export type FilterCategory =
  | 'Natural' | 'Portrait' | 'Cinematic' | 'Film' | 'Vintage'
  | 'Retro' | 'Black & White' | 'Moody' | 'Warm' | 'Cool'
  | 'Sunset' | 'Night' | 'Street' | 'Travel' | 'Landscape'
  | 'Food' | 'Fashion' | 'Dramatic' | 'Soft' | 'Professional';

export const FILTER_CATEGORIES: FilterCategory[] = [
  'Natural', 'Portrait', 'Cinematic', 'Film', 'Vintage',
  'Retro', 'Black & White', 'Moody', 'Warm', 'Cool',
  'Sunset', 'Night', 'Street', 'Travel', 'Landscape',
  'Food', 'Fashion', 'Dramatic', 'Soft', 'Professional',
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
}
