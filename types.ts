
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
  isBlurEnabled: boolean;
  subjectSide: 'left' | 'right';
  subjectZoom: number; // 0 to 100 scale for subject prominence
}

export interface GeneratedMetadata {
  altText: string;
  suggestedFilename: string;
  tags: string[];
}
