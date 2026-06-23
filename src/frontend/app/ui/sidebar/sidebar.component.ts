import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {NgIf, NgFor, AsyncPipe} from '@angular/common';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {NgIconComponent} from '@ng-icons/core';
import {BehaviorSubject, Subscription} from 'rxjs';
import {Config} from '../../../../common/config/public/Config';
import {UserDTO, UserRoles} from '../../../../common/entities/UserDTO';
import {AuthenticationService} from '../../model/network/authentication.service';
import {ThemeService} from '../../model/theme.service';
import {QueryService} from '../../model/query.service';
import {ThemeModes} from '../../../../common/config/public/ClientConfig';
import {FavoriteFolderService} from '../../model/favorite.service';
import {SidebarService} from '../../model/sidebar.service';
import {AIService} from '../../model/ai.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    RouterLink,
    RouterLinkActive,
    NgIconComponent,
  ],
})
export class SidebarComponent implements OnInit, OnDestroy {
  public readonly user: BehaviorSubject<UserDTO>;
  public readonly title = Config.Server.applicationTitle;
  public readonly themesEnabled = Config.Gallery.Themes.enabled;
  public readonly authenticationRequired = Config.Users.authenticationRequired;
  public readonly ThemeModes = ThemeModes;
  public isMobile = false;
  private userSub: Subscription = null;

  constructor(
    private authService: AuthenticationService,
    public themeService: ThemeService,
    public queryService: QueryService,
    public favoriteService: FavoriteFolderService,
    public sidebarService: SidebarService,
    public aiService: AIService
  ) {
    this.user = this.authService.user;
    this.updateIsMobile();
  }

  // open/close state is shared so the navbar can toggle the sidebar overlay
  get open(): boolean {
    return this.sidebarService.open.value;
  }

  // desktop persistent-sidebar hide state (toggled from the navbar button)
  get collapsed(): boolean {
    return this.sidebarService.collapsed.value;
  }

  ngOnInit(): void {
    // (Re)load favorites whenever an authenticated user context appears.
    this.userSub = this.user.subscribe((u): void => {
      if (u) {
        this.favoriteService.load().catch((): void => {
          /* ignore (e.g. not yet authenticated) */
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSub) {
      this.userSub.unsubscribe();
      this.userSub = null;
    }
  }

  // Sidebar is shown once a user context exists (or when auth is disabled).
  get visible(): boolean {
    return !this.authenticationRequired || !!this.user.value;
  }

  @HostListener('window:resize')
  updateIsMobile(): void {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.sidebarService.close();
    }
  }

  toggle(): void {
    this.sidebarService.toggle();
  }

  close(): void {
    this.sidebarService.close();
  }

  // Close button hides the sidebar at any size: overlay on mobile,
  // persistent collapse on desktop.
  hide(): void {
    if (window.innerWidth < 768) {
      this.sidebarService.close();
    } else {
      this.sidebarService.collapsed.next(true);
    }
  }

  // Theme is a simple light/dark switch (no system/auto option).
  get isDark(): boolean {
    return this.themeService.darkMode.value;
  }

  toggleTheme(): void {
    this.themeService.setMode(this.isDark ? ThemeModes.light : ThemeModes.dark);
  }

  isGalleryAvailable(): boolean {
    return this.user.value && this.user.value.role >= UserRoles.User;
  }

  isAlbumsAvailable(): boolean {
    return (
      Config.Album.enabled &&
      this.user.value &&
      this.user.value.role >= Config.Album.readAccessMinRole
    );
  }

  isFacesAvailable(): boolean {
    return (
      Config.Faces.enabled &&
      this.user.value &&
      this.user.value.role >= Config.Faces.readAccessMinRole
    );
  }
}
