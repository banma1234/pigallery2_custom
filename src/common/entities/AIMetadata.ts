export enum AIMetadataSource {
  basic = 'basic',     // generic Stable Diffusion (A1111 "parameters")
  comfy = 'comfy',     // ComfyUI
  novelai = 'novelai', // NovelAI
}

// 기본 — generic generation parameters (normalized)
export interface AIBasicMetadata {
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  width?: number;
  height?: number;
  raw?: string; // original parameters text (fallback)
}

// ComfyUI — parsed common fields + raw blobs
export interface AIComfyMetadata {
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  scheduler?: string;
  denoise?: number;
  width?: number;
  height?: number;
  workflow?: string;    // raw 'workflow' JSON string
  promptGraph?: string; // raw 'prompt' JSON string
}

// NovelAI — parsed Comment JSON + raw blob
export interface AINovelAIMetadata {
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  seed?: string; // NovelAI seeds are large integers; kept as string
  steps?: number;
  scale?: number;
  uncondScale?: number;
  cfgRescale?: number;
  sampler?: string;
  noiseSchedule?: string;
  smea?: boolean;
  smeaDyn?: boolean;
  width?: number;
  height?: number;
  comment?: string; // raw Comment JSON (fallback)
}

export interface AIMetadata {
  source: AIMetadataSource;
  // only the sub-object matching `source` is populated
  basic?: AIBasicMetadata;
  comfy?: AIComfyMetadata;
  novelai?: AINovelAIMetadata;
  // true when this metadata was recovered from stealth (alpha/RGB LSB) data
  // by the background AI metadata job rather than from PNG text chunks/EXIF
  stealth?: boolean;
}
