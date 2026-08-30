/**
 * lenses/lens-types.ts
 */
import { ProcessingProfile } from '../shared/processing-types';
import { AttributionMetadata, UnlockMetadata } from '../shared/metadata';

export type LensSpecialty =
  | 'low-light' | 'night' | 'stars-sky' | 'dark-scenes' | 'portrait'
  | 'landscape' | 'architecture' | 'street' | 'food' | 'cinematic'
  | 'hdr' | 'fine-texture' | 'detail-sharpness' | 'soft-natural'
  | 'golden-hour' | 'blue-hour' | 'atmospheric' | 'motion' | 'travel' | 'universal';

export interface LensDefinition {
  id: string;
  name: string;
  specialty: LensSpecialty;
  description: string;
  visualDescription: string;
  icon: string;
  previewKey: string;
  processingProfile: ProcessingProfile;
  intensityRange: { min: number; max: number; default: number };
  supportsPreview: true;
  supportsFullResolution: true;
  supportsCamera: true;
  supportsLivePreview: boolean;
  supportsVideo: boolean;
  recommendedLighting: string;
  recommendedSubjects: string;
  developerNotes: string;
  attribution: AttributionMetadata;
  unlock: UnlockMetadata;
}
