import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

/**
 * Shared open/close state for the navigation sidebar, so the top navbar
 * (frame) can toggle the sidebar overlay on small screens.
 */
@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  // mobile off-canvas overlay open/close
  public readonly open = new BehaviorSubject<boolean>(false);
  // desktop persistent sidebar hide/show
  public readonly collapsed = new BehaviorSubject<boolean>(false);

  toggle(): void {
    this.open.next(!this.open.value);
  }

  close(): void {
    this.open.next(false);
  }

  toggleCollapsed(): void {
    this.collapsed.next(!this.collapsed.value);
  }
}
