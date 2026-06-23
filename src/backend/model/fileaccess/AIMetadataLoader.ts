import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import {
  AIBasicMetadata,
  AIComfyMetadata,
  AIMetadata,
  AIMetadataSource,
  AINovelAIMetadata,
} from '../../../common/entities/AIMetadata';

/**
 * Result of a stealth (LSB) scan.
 * - detected: a stealth magic signature was present -> the image is an AI
 *   export, even if the hidden payload could not be parsed.
 * - metadata: the parsed metadata, or null when only detection succeeded.
 */
export interface StealthResult {
  detected: boolean;
  metadata: AIMetadata | null;
}

/**
 * Extracts AI image-generation metadata at scan time.
 *
 * Sources (in priority order): NovelAI, ComfyUI, generic Stable Diffusion
 * ("basic"). Candidate text comes from PNG text chunks (tEXt/iTXt/zTXt),
 * EXIF UserComment/ImageDescription (e.g. WebP/JPEG) and the already-parsed
 * title/caption. Non-AI images are cheaply skipped (no markers -> null).
 *
 * Stealth alpha/RGB-LSB data is NOT read here (it requires a full pixel
 * decode). It is read later by the background AI metadata job via
 * extractStealth(), for PNG candidates that have no text-chunk metadata.
 */
export class AIMetadataLoader {
  public static extract(
    fullPath: string,
    exif: any,
    title?: string,
    caption?: string
  ): AIMetadata | null {
    const ext = path.extname(fullPath).toLowerCase();
    const chunks: { [k: string]: string } =
      ext === '.png' ? AIMetadataLoader.readPngTextChunks(fullPath) : {};
    const exifTexts = AIMetadataLoader.gatherTexts(exif, title, caption);
    return AIMetadataLoader.classify(chunks, exifTexts);
  }

  /**
   * Cheap, format-agnostic gate: is this image worth a (heavy) stealth scan?
   * Only PNG and lossless-capable WebP can carry LSB-hidden data.
   */
  public static isStealthCandidate(fullPath: string): boolean {
    const ext = path.extname(fullPath).toLowerCase();
    return ext === '.png' || ext === '.webp';
  }

  /**
   * Classify candidate metadata into one of the AI sources. Shared by the
   * scan-time text-chunk path and the stealth-payload path.
   */
  private static classify(
    chunks: { [k: string]: string },
    texts: string[]
  ): AIMetadata | null {
    // 1. NovelAI
    if (
      chunks['Software'] === 'NovelAI' ||
      /NovelAI/i.test(chunks['Source'] || '') ||
      (chunks['Comment'] && AIMetadataLoader.isNovelAIJson(chunks['Comment']))
    ) {
      return {
        source: AIMetadataSource.novelai,
        novelai: AIMetadataLoader.parseNovelAI(
          chunks['Description'],
          chunks['Comment'],
          chunks['Software'] || chunks['Source']
        ),
      };
    }

    // 2. ComfyUI — 'prompt'/'workflow' chunks must actually be node graphs
    if (
      AIMetadataLoader.isComfyJson(chunks['prompt']) ||
      AIMetadataLoader.isComfyJson(chunks['workflow']) ||
      (!!chunks['workflow'] && !!chunks['prompt'])
    ) {
      return {
        source: AIMetadataSource.comfy,
        comfy: AIMetadataLoader.parseComfy(chunks['workflow'], chunks['prompt']),
      };
    }

    // 3. generic Stable Diffusion ("parameters") — also covers params embedded
    //    in EXIF UserComment / ImageDescription / title / caption
    const paramChunk =
      chunks['parameters'] ?? chunks['Parameters'] ?? chunks['Dream'];
    const basicCandidates = [paramChunk, ...texts].filter(
      (t): t is string => !!t
    );
    for (const t of basicCandidates) {
      if (AIMetadataLoader.looksLikeA1111(t)) {
        return {source: AIMetadataSource.basic, basic: AIMetadataLoader.parseA1111(t)};
      }
    }

    // 4. JSON generation data embedded in any candidate text (Comfy or NovelAI)
    for (const t of [...Object.values(chunks), ...texts]) {
      if (AIMetadataLoader.isComfyJson(t)) {
        return {source: AIMetadataSource.comfy, comfy: AIMetadataLoader.parseComfy(undefined, t)};
      }
      if (AIMetadataLoader.isNovelAIJson(t)) {
        return {source: AIMetadataSource.novelai, novelai: AIMetadataLoader.parseNovelAI(undefined, t, undefined)};
      }
    }

    return null;
  }

  // --- PNG text chunk reader (tEXt / iTXt / zTXt) ---
  private static readPngTextChunks(fullPath: string): { [k: string]: string } {
    const out: { [k: string]: string } = {};
    let buffer: Buffer;
    try {
      buffer = fs.readFileSync(fullPath);
    } catch {
      return out;
    }
    if (buffer.length < 8 || buffer.readUInt32BE(0) !== 0x89504e47) {
      return out;
    }
    let offset = 8;
    while (offset + 8 <= buffer.length) {
      const len = buffer.readUInt32BE(offset);
      const type = buffer.toString('latin1', offset + 4, offset + 8);
      const dataStart = offset + 8;
      const dataEnd = dataStart + len;
      if (dataEnd + 4 > buffer.length) {
        break;
      }
      const data = buffer.subarray(dataStart, dataEnd);
      try {
        if (type === 'tEXt') {
          const sep = data.indexOf(0);
          if (sep >= 0) {
            out[data.toString('latin1', 0, sep)] = data.toString('latin1', sep + 1);
          }
        } else if (type === 'zTXt') {
          const sep = data.indexOf(0);
          if (sep >= 0) {
            out[data.toString('latin1', 0, sep)] = zlib
              .inflateSync(data.subarray(sep + 2))
              .toString('utf8');
          }
        } else if (type === 'iTXt') {
          const sep = data.indexOf(0);
          const keyword = data.toString('latin1', 0, sep);
          const compFlag = data[sep + 1];
          let p = sep + 3;
          p = data.indexOf(0, p) + 1; // skip language tag
          p = data.indexOf(0, p) + 1; // skip translated keyword
          const textBuf = data.subarray(p);
          out[keyword] =
            compFlag === 1
              ? zlib.inflateSync(textBuf).toString('utf8')
              : textBuf.toString('utf8');
        } else if (type === 'IEND') {
          break;
        }
      } catch {
        // ignore malformed chunk
      }
      offset = dataEnd + 4; // skip CRC
    }
    return out;
  }

  private static gatherTexts(exif: any, title?: string, caption?: string): string[] {
    const texts: string[] = [];
    const add = (v: unknown): void => {
      if (typeof v === 'string' && v.trim().length > 0) {
        texts.push(v);
      }
    };
    if (exif) {
      add(exif?.exif?.UserComment);
      add(exif?.UserComment);
      add(exif?.ifd0?.ImageDescription);
      add(exif?.image?.ImageDescription);
      add(exif?.ImageDescription);
    }
    add(title);
    add(caption);
    return texts;
  }

  // --- detection helpers ---
  // A1111/SD "parameters" signature. Requires the settings line marker
  // "Steps:" plus at least one more generation key, so ordinary captions or
  // titles that merely contain the word "steps" are not misclassified.
  private static looksLikeA1111(t: string): boolean {
    if (!t || !/(^|\s)Steps:\s*\d/.test(t)) {
      return false;
    }
    const keyHits = [
      /Sampler:/,
      /Seed:\s*\d/,
      /CFG scale:/i,
      /Model:/,
      /Model hash:/i,
      /Schedule type:/i,
      /Negative prompt:/,
    ].filter((re) => re.test(t)).length;
    return keyHits >= 1;
  }

  private static tryParse(t?: string): any {
    if (!t) {
      return null;
    }
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }

  private static isNovelAIJson(t?: string): boolean {
    const j = AIMetadataLoader.tryParse(t);
    if (!j || typeof j !== 'object') {
      return false;
    }
    return (
      'uc' in j ||
      'noise_schedule' in j ||
      ('sampler' in j && 'steps' in j && 'scale' in j)
    );
  }

  private static isComfyJson(t?: string): boolean {
    const j = AIMetadataLoader.tryParse(t);
    if (!j || typeof j !== 'object') {
      return false;
    }
    return Object.values(j).some(
      (n: any) => n && typeof n === 'object' && 'class_type' in n
    );
  }

  // --- parsers ---
  private static parseA1111(text: string): AIBasicMetadata {
    const result: AIBasicMetadata = {raw: text};
    const negIdx = text.indexOf('Negative prompt:');
    // settings line: the last line that contains "Steps:"
    const lines = text.split(/\r?\n/);
    let settingsLineIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/(^|\s)Steps:\s*\d/.test(lines[i])) {
        settingsLineIdx = i;
        break;
      }
    }
    const settings = settingsLineIdx >= 0 ? lines[settingsLineIdx] : '';
    const beforeSettings =
      settingsLineIdx >= 0 ? lines.slice(0, settingsLineIdx).join('\n') : text;

    if (negIdx >= 0 && negIdx < (settingsLineIdx >= 0 ? beforeSettings.length + 1 : text.length)) {
      result.prompt = beforeSettings.substring(0, beforeSettings.indexOf('Negative prompt:')).trim();
      result.negativePrompt = beforeSettings
        .substring(beforeSettings.indexOf('Negative prompt:') + 'Negative prompt:'.length)
        .trim();
    } else {
      result.prompt = beforeSettings.trim();
    }

    const get = (key: string): string | undefined => {
      const m = settings.match(new RegExp(key + ':\\s*([^,]+)'));
      return m ? m[1].trim() : undefined;
    };
    const steps = get('Steps');
    if (steps) {
      result.steps = parseInt(steps, 10);
    }
    result.sampler = get('Sampler');
    const cfg = get('CFG scale');
    if (cfg) {
      result.cfgScale = parseFloat(cfg);
    }
    const seed = get('Seed');
    if (seed) {
      result.seed = parseInt(seed, 10);
    }
    const size = get('Size');
    if (size && /\d+x\d+/.test(size)) {
      const [w, h] = size.split('x');
      result.width = parseInt(w, 10);
      result.height = parseInt(h, 10);
    }
    result.model = get('Model');
    return result;
  }

  private static parseComfy(workflow?: string, promptGraph?: string): AIComfyMetadata {
    const result: AIComfyMetadata = {};
    if (workflow) {
      result.workflow = workflow;
    }
    if (promptGraph) {
      result.promptGraph = promptGraph;
    }
    const graph = AIMetadataLoader.tryParse(promptGraph);
    if (!graph || typeof graph !== 'object') {
      return result;
    }
    const num = (v: any): number | undefined =>
      typeof v === 'number' ? v : v != null && !isNaN(+v) ? +v : undefined;
    const str = (v: any): string | undefined =>
      typeof v === 'string' ? v : undefined;
    const resolveText = (link: any): string | undefined => {
      if (Array.isArray(link) && graph[link[0]]) {
        const node = graph[link[0]];
        const t = node?.inputs?.text;
        return typeof t === 'string' ? t : undefined;
      }
      return undefined;
    };

    for (const id of Object.keys(graph)) {
      const ct = (graph[id]?.class_type as string) || '';
      const inputs = graph[id]?.inputs || {};
      if (/KSampler/i.test(ct) && result.seed === undefined) {
        result.seed = num(inputs.seed ?? inputs.noise_seed);
        result.steps = num(inputs.steps);
        result.cfgScale = num(inputs.cfg);
        result.sampler = str(inputs.sampler_name);
        result.scheduler = str(inputs.scheduler);
        result.denoise = num(inputs.denoise);
        result.prompt = resolveText(inputs.positive);
        result.negativePrompt = resolveText(inputs.negative);
      }
      if (/CheckpointLoader|UNETLoader/i.test(ct) && !result.model) {
        result.model = str(inputs.ckpt_name ?? inputs.unet_name);
      }
      if (/EmptyLatent|LatentImage|EmptySD3/i.test(ct) && result.width === undefined) {
        result.width = num(inputs.width);
        result.height = num(inputs.height);
      }
    }
    return result;
  }

  private static parseNovelAI(
    description?: string,
    comment?: string,
    model?: string
  ): AINovelAIMetadata {
    const result: AINovelAIMetadata = {};
    if (model) {
      result.model = model;
    }
    if (comment) {
      result.comment = comment;
    }
    const c = AIMetadataLoader.tryParse(comment);
    const num = (v: any): number | undefined =>
      typeof v === 'number' ? v : v != null && !isNaN(+v) ? +v : undefined;
    const str = (v: any): string | undefined =>
      typeof v === 'string' ? v : undefined;
    if (c && typeof c === 'object') {
      result.prompt = str(c.prompt) ?? str(description);
      result.negativePrompt = str(c.uc);
      result.seed = c.seed != null ? String(c.seed) : undefined;
      result.steps = num(c.steps);
      result.scale = num(c.scale);
      result.uncondScale = num(c.uncond_scale);
      result.cfgRescale = num(c.cfg_rescale);
      result.sampler = str(c.sampler);
      result.noiseSchedule = str(c.noise_schedule);
      result.smea = typeof c.sm === 'boolean' ? c.sm : undefined;
      result.smeaDyn = typeof c.sm_dyn === 'boolean' ? c.sm_dyn : undefined;
      result.width = num(c.width);
      result.height = num(c.height);
    } else {
      result.prompt = str(description);
    }
    return result;
  }

  // ===================== stealth (LSB) extraction =====================
  // Recovers generation metadata hidden in the alpha/RGB least-significant
  // bits (A1111 "stealth_pnginfo" convention, also used by NovelAI/Comfy
  // exports). Heavy: requires a full pixel decode, so it runs in the
  // background job, never at scan time.
  private static readonly STEALTH_SIGNATURES = [
    'stealth_pnginfo', // alpha LSB, uncompressed
    'stealth_pngcomp', // alpha LSB, gzip
    'stealth_rgbinfo', // RGB LSB, uncompressed
    'stealth_rgbcomp', // RGB LSB, gzip
  ];

  public static async extractStealth(fullPath: string): Promise<StealthResult> {
    if (!AIMetadataLoader.isStealthCandidate(fullPath)) {
      return {detected: false, metadata: null};
    }
    let data: Buffer;
    let width: number;
    let height: number;
    let channels: number;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sharp = require('sharp');
      const res = await sharp(fullPath)
        .ensureAlpha()
        .raw()
        .toBuffer({resolveWithObject: true});
      data = res.data;
      width = res.info.width;
      height = res.info.height;
      channels = res.info.channels;
    } catch {
      return {detected: false, metadata: null};
    }
    if (!data || width <= 0 || height <= 0 || channels < 4) {
      return {detected: false, metadata: null};
    }

    // Bit getters: A1111 scans column-major (x outer, y inner).
    const alphaBit = (i: number): number => {
      const x = Math.floor(i / height);
      const y = i % height;
      return data[(y * width + x) * channels + 3] & 1;
    };
    const rgbBit = (i: number): number => {
      const pixel = Math.floor(i / 3);
      const ch = i % 3;
      const x = Math.floor(pixel / height);
      const y = pixel % height;
      return data[(y * width + x) * channels + ch] & 1;
    };

    const alphaTotal = width * height;
    const rgbTotal = width * height * 3;

    // Returns null when the stealth magic signature is absent for this mode.
    // When the signature IS present the image is a stealth/AI export, so
    // `detected` is true regardless of whether the payload could be parsed.
    const tryMode = (
      getBit: (i: number) => number,
      total: number
    ): StealthResult | null => {
      const sig = AIMetadataLoader.bitsToString(getBit, 0, 15, total);
      if (AIMetadataLoader.STEALTH_SIGNATURES.indexOf(sig) === -1) {
        return null;
      }
      const compressed = sig.endsWith('comp');
      let lenBitsStart = 15 * 8;
      // 32-bit big-endian length, in bits, of the payload
      let payloadBits = 0;
      for (let i = 0; i < 32; i++) {
        if (lenBitsStart + i >= total) {
          return {detected: true, metadata: null};
        }
        payloadBits = (payloadBits * 2) + (getBit(lenBitsStart + i) ? 1 : 0);
      }
      lenBitsStart += 32;
      if (
        payloadBits <= 0 ||
        payloadBits > 64 * 1024 * 1024 ||
        lenBitsStart + payloadBits > total
      ) {
        return {detected: true, metadata: null};
      }
      let bytes = AIMetadataLoader.bitsToBytes(getBit, lenBitsStart, payloadBits);
      if (compressed) {
        try {
          bytes = zlib.gunzipSync(bytes);
        } catch {
          try {
            bytes = zlib.inflateSync(bytes);
          } catch {
            return {detected: true, metadata: null};
          }
        }
      }
      const text = bytes.toString('utf8');
      const meta = AIMetadataLoader.classifyText(text);
      if (meta) {
        meta.stealth = true;
      }
      return {detected: true, metadata: meta};
    };

    return tryMode(alphaBit, alphaTotal) || tryMode(rgbBit, rgbTotal) || {detected: false, metadata: null};
  }

  // Classify a single decoded stealth payload: either a JSON dict of PNG
  // text chunks, a node graph / NovelAI comment, or an A1111 parameters text.
  private static classifyText(text: string): AIMetadata | null {
    if (!text || text.trim().length === 0) {
      return null;
    }
    const j = AIMetadataLoader.tryParse(text);
    if (j && typeof j === 'object' && !Array.isArray(j)) {
      const looksLikeChunkDict =
        typeof j.parameters === 'string' ||
        'Comment' in j ||
        'Software' in j ||
        'Description' in j ||
        'prompt' in j ||
        'workflow' in j;
      if (looksLikeChunkDict) {
        const chunks: { [k: string]: string } = {};
        for (const k of Object.keys(j)) {
          chunks[k] = typeof j[k] === 'string' ? j[k] : JSON.stringify(j[k]);
        }
        const m = AIMetadataLoader.classify(chunks, []);
        if (m) {
          return m;
        }
      }
    }
    return AIMetadataLoader.classify({}, [text]);
  }

  // Read `count` bytes (count*8 bits) starting at bit `start`.
  private static bitsToBytes(
    getBit: (i: number) => number,
    start: number,
    numBits: number
  ): Buffer {
    const out = Buffer.alloc(Math.ceil(numBits / 8));
    for (let i = 0; i < numBits; i++) {
      if (getBit(start + i)) {
        out[i >> 3] |= 0x80 >> (i & 7);
      }
    }
    return out;
  }

  // Read `numChars` ASCII chars (numChars*8 bits) from bit `start`.
  private static bitsToString(
    getBit: (i: number) => number,
    start: number,
    numChars: number,
    total: number
  ): string {
    if (start + numChars * 8 > total) {
      return '';
    }
    return AIMetadataLoader.bitsToBytes(getBit, start, numChars * 8).toString('latin1');
  }
}
