import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {GalleryCacheService} from '../ui/gallery/cache.gallery.service';

/**
 * Global, browser-persisted AI mode toggle. When on, the lightbox info panel
 * shows the AI image-generation metadata section.
 */
@Injectable({
  providedIn: 'root',
})
export class AIService {
  public readonly enabled: BehaviorSubject<boolean>;

  constructor(private cachingService: GalleryCacheService) {
    this.enabled = new BehaviorSubject<boolean>(this.cachingService.getAIMode());
  }

  toggle(): void {
    this.setEnabled(!this.enabled.value);
  }

  setEnabled(enabled: boolean): void {
    this.enabled.next(enabled);
    this.cachingService.setAIMode(enabled);
  }
}
