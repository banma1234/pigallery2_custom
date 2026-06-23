import {Component, ElementRef, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {GalleryPhotoComponent} from '../../grid/photo/photo.grid.gallery.component';

/**
 * Vertical thumbnail rail shown in the lightbox (right side, left of the info
 * panel). Reuses the already-loaded thumbnails of the rendered grid photos
 * (gridPhotoQL), so it does not create or manage its own Thumbnail objects.
 */
@Component({
  selector: 'app-lightbox-filmstrip',
  templateUrl: './filmstrip.lightbox.gallery.component.html',
  styleUrls: ['./filmstrip.lightbox.gallery.component.css'],
  imports: [NgFor, NgIf],
})
export class FilmstripLightboxComponent implements OnChanges {
  @Input() photos: GalleryPhotoComponent[] = [];
  @Input() activeIndex = 0;
  @Output() select = new EventEmitter<number>();
  private lastScrolledIndex = -1;

  constructor(private host: ElementRef) {}

  ngOnChanges(): void {
    // keep the active thumbnail scrolled into view, but only when it changes
    if (this.activeIndex === this.lastScrolledIndex) {
      return;
    }
    this.lastScrolledIndex = this.activeIndex;
    setTimeout((): void => {
      const el = this.host.nativeElement.querySelector('.film-thumb.active');
      if (el) {
        el.scrollIntoView({block: 'nearest'});
      }
    }, 0);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
