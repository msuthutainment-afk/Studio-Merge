
export interface ImageState {
  src: string;
  file: File | null;
  width: number;
  height: number;
}

export interface BrandingConfig {
  logoSize: number;
  padding: number;
  circleOpacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  split: number; 
  softness: number; 
  angle: number; 
  isBlurEnabled: boolean; // Replaced intensity with a toggle
}

export interface GeneratedMetadata {
  altText: string;
  suggestedFilename: string;
  tags: string[];
}
