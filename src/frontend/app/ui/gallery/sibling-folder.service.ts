import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {NetworkService} from '../../model/network/network.service';
import {QueryService} from '../../model/query.service';
import {Utils} from '../../../../common/Utils';
import {MediaDTO} from '../../../../common/entities/MediaDTO';
import {
  ContentWrapperUtils,
  PackedContentWrapperWithError,
} from '../../../../common/entities/ContentWrapper';

/**
 * Sibling-folder navigation for the lightbox: jump from the current directory
 * to the first photo of the previous/next sibling directory (sorted by name
 * ascending). Fetches the parent directory read-only so the current view is
 * not disturbed.
 */
@Injectable({
  providedIn: 'root',
})
export class SiblingFolderService {
  public hasPrev = false;
  public hasNext = false;

  private readonly collator = new Intl.Collator(undefined, {numeric: true});
  private siblings: { name: string; full: string }[] = [];
  private currentIndex = -1;
  private cachedParent: string = null;

  constructor(
    private networkService: NetworkService,
    private queryService: QueryService,
    private router: Router
  ) {}

  // Recompute prev/next availability for the directory the given media is in.
  public async update(media: MediaDTO): Promise<void> {
    if (!media || !media.directory) {
      this.reset();
      return;
    }
    const parentPath = media.directory.path;
    const currentFull = Utils.concatUrls(media.directory.path, media.directory.name);

    if (this.cachedParent !== parentPath || this.siblings.length === 0) {
      this.cachedParent = parentPath;
      this.siblings = await this.fetchSiblings(parentPath);
    }
    this.currentIndex = this.siblings.findIndex((s) => s.full === currentFull);
    this.hasPrev = this.currentIndex > 0;
    this.hasNext = this.currentIndex >= 0 && this.currentIndex < this.siblings.length - 1;
  }

  public async goPrev(media: MediaDTO): Promise<void> {
    await this.goTo(media, -1);
  }

  public async goNext(media: MediaDTO): Promise<void> {
    await this.goTo(media, 1);
  }

  private reset(): void {
    this.siblings = [];
    this.currentIndex = -1;
    this.cachedParent = null;
    this.hasPrev = false;
    this.hasNext = false;
  }

  private async goTo(media: MediaDTO, delta: number): Promise<void> {
    await this.update(media);
    const targetIndex = this.currentIndex + delta;
    if (this.currentIndex < 0 || targetIndex < 0 || targetIndex >= this.siblings.length) {
      return;
    }
    const target = this.siblings[targetIndex];
    const firstPhoto = await this.firstPhotoOf(target.full);
    this.router.navigate(['/gallery', target.full], {
      queryParams: firstPhoto
        ? this.queryService.getParams({media: firstPhoto})
        : this.queryService.getParams(),
      queryParamsHandling: 'merge',
    }).catch((err) => console.error('Cannot navigate to sibling folder', err));
  }

  private async fetchSiblings(parentPath: string): Promise<{ name: string; full: string }[]> {
    const content = await this.fetchDirectory(parentPath);
    const dirs = content?.directory?.directories || [];
    return dirs
      .map((d) => ({name: d.name, full: Utils.concatUrls(d.path, d.name)}))
      .sort((a, b) => this.collator.compare(a.name, b.name));
  }

  private async firstPhotoOf(dirFull: string): Promise<MediaDTO | null> {
    const content = await this.fetchDirectory(dirFull);
    const media = (content?.directory?.media || []).slice();
    if (media.length === 0) {
      return null;
    }
    media.sort((a, b) => this.collator.compare(a.name, b.name));
    return media[0];
  }

  private async fetchDirectory(directoryName: string) {
    try {
      const cw = await this.networkService.getJson<PackedContentWrapperWithError>(
        '/gallery/content/' + encodeURIComponent(directoryName)
      );
      return ContentWrapperUtils.unpack(cw);
    } catch (e) {
      console.error('Cannot load directory for sibling navigation', e);
      return null;
    }
  }
}
