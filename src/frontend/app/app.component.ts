import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthenticationService} from './model/network/authentication.service';
import {Config} from '../../common/config/public/Config';
import {Title} from '@angular/platform-browser';
import {ShareService} from './ui/gallery/share.service';
import 'hammerjs';
import {Subscription} from 'rxjs';
import {NavigationService} from './model/navigation.service';
import {ThemeService} from './model/theme.service';
import { RouterOutlet } from '@angular/router';
import {AsyncPipe} from '@angular/common';
import {SidebarComponent} from './ui/sidebar/sidebar.component';
import {SidebarService} from './model/sidebar.service';

@Component({
    selector: 'app-pi-gallery2',
    template: `
    <app-sidebar></app-sidebar>
    <div class="app-content-shell" [class.with-sidebar]="showSidebar && !(sidebarService.collapsed | async)">
      <router-outlet></router-outlet>
    </div>`,
    imports: [RouterOutlet, SidebarComponent, AsyncPipe]
})
export class AppComponent implements OnInit, OnDestroy {
  private subscription: Subscription = null;

  // Reserve the left sidebar gutter only once a user context exists
  // (keeps the login page centered).
  get showSidebar(): boolean {
    return !Config.Users.authenticationRequired || this.authenticationService.isAuthenticated();
  }

  constructor(
    private authenticationService: AuthenticationService,
    private shareService: ShareService,
    private navigation: NavigationService,
    private title: Title,
    private themeService: ThemeService,
    public sidebarService: SidebarService
  ) {
    themeService.init();
  }

  async ngOnInit(): Promise<void> {
    this.title.setTitle(Config.Server.applicationTitle);
    await this.shareService.wait();
    this.subscription = this.authenticationService.user.subscribe(() => {
      if(this.navigation.isErrorPage()){ //stay on the error page, do not auto navigate
        return;
      }
      if (this.authenticationService.isAuthenticated()) {
        if (this.navigation.isLoginPage()) {
          return this.navigation.toDefault();
        }
      } else {
        if (!this.navigation.isLoginPage()) {
          return this.navigation.toLogin();
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription != null) {
      this.subscription.unsubscribe();
    }
  }

}
