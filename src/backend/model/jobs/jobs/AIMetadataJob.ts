import {DefaultsJobs} from '../../../../common/entities/job/JobDTO';
import {FileJob} from './FileJob';
import {FileDTO} from '../../../../common/entities/FileDTO';
import {SQLConnection} from '../../database/SQLConnection';
import {PhotoEntity} from '../../database/enitites/PhotoEntity';
import {ProjectPath} from '../../../ProjectPath';
import {AIMetadataLoader, StealthResult} from '../../fileaccess/AIMetadataLoader';
import {AIMetadata} from '../../../../common/entities/AIMetadata';
import {Logger} from '../../../Logger';
import * as path from 'path';

/**
 * Background pass that recovers AI generation metadata hidden in the
 * alpha/RGB least-significant bits ("stealth pnginfo"). This is heavy (full
 * pixel decode), so it is intentionally deferred out of the scan path and run
 * after indexing completes.
 *
 * It only targets PNG/WebP candidates that have NOT already produced AI
 * metadata from text chunks/EXIF at scan time. A persistent `aiScanned` flag
 * makes the work list DB-backed and resumable across restarts.
 */
export class AIMetadataJob extends FileJob {
  public readonly Name = DefaultsJobs[DefaultsJobs['AI Metadata']];

  // Work list: fullPath -> media id. Built lazily on first use so no async
  // DB work happens in init() (the base Job does not await init()).
  private pending = new Map<string, number>();
  private pendingLoaded = false;

  constructor() {
    // photos only; metadata sidecar files are irrelevant here
    super({noVideo: true, noMetaFile: true});
  }

  get LOG_TAG(): string {
    return '[AIMetadataJob]';
  }

  public get Supported(): boolean {
    return true;
  }

  protected async init(): Promise<void> {
    this.pending = new Map<string, number>();
    this.pendingLoaded = false;
    await super.init();
  }

  // Build the work list once: PNG/WebP, not yet AI-flagged, not yet scanned.
  private async ensurePending(): Promise<void> {
    if (this.pendingLoaded) {
      return;
    }
    this.pendingLoaded = true;
    const connection = await SQLConnection.getConnection();
    const rows = await connection
      .getRepository(PhotoEntity)
      .createQueryBuilder('media')
      .leftJoin('media.directory', 'directory')
      .select(['media.id', 'media.name', 'directory.name', 'directory.path'])
      .where('media.metadata.aiScanned = :scanned', {scanned: false})
      .andWhere('media.metadata.isAIGenerated = :gen', {gen: false})
      .andWhere('(LOWER(media.name) LIKE :png OR LOWER(media.name) LIKE :webp)', {
        png: '%.png',
        webp: '%.webp',
      })
      .getMany();
    for (const r of rows) {
      const full = path.join(
        ProjectPath.ImageFolder,
        r.directory.path,
        r.directory.name,
        r.name
      );
      this.pending.set(full, r.id);
    }
    Logger.silly(this.LOG_TAG, 'Stealth candidates to scan: ' + this.pending.size);
  }

  protected async filterMediaFiles(files: FileDTO[]): Promise<FileDTO[]> {
    // cheap extension gate before the (heavier) per-file checks
    return files.filter((f) => AIMetadataLoader.isStealthCandidate(f.name));
  }

  protected async shouldProcess(mPath: string): Promise<boolean> {
    await this.ensurePending();
    return this.pending.has(mPath);
  }

  protected async processFile(mPath: string): Promise<void> {
    const id = this.pending.get(mPath);
    let res: StealthResult = {detected: false, metadata: null};
    try {
      res = await AIMetadataLoader.extractStealth(mPath);
    } catch (e) {
      Logger.silly(this.LOG_TAG, 'Stealth scan failed for: ' + mPath);
    }

    if (id == null) {
      return;
    }
    const patch: { aiScanned: boolean; isAIGenerated?: boolean; aiMetadata?: AIMetadata } = {
      aiScanned: true,
    };
    // Passing the detection gate flags the image as AI, independent of whether
    // the hidden payload could be parsed into structured metadata.
    if (res.detected) {
      patch.isAIGenerated = true;
    }
    if (res.metadata) {
      patch.aiMetadata = res.metadata;
    }
    const connection = await SQLConnection.getConnection();
    // partial embedded update: touches only the AI columns
    await connection.getRepository(PhotoEntity).update(id, {metadata: patch} as never);
    this.pending.delete(mPath);
  }
}
