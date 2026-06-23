import {enableProdMode, importProvidersFrom, Injectable} from '@angular/core';
import {environment} from './environments/environment';
import {HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import {ErrorInterceptor} from './app/model/network/helper/error.interceptor';
import {DefaultUrlSerializer, UrlSerializer, UrlTree} from '@angular/router';
import {bootstrapApplication, BrowserModule, HAMMER_GESTURE_CONFIG, HammerGestureConfig, HammerModule} from '@angular/platform-browser';
import {StringifySortingMethod} from './app/pipes/StringifySortingMethod';
import {NetworkService} from './app/model/network/network.service';
import {ShareService} from './app/ui/gallery/share.service';
import {UserService} from './app/model/network/user.service';
import {AlbumsService} from './app/ui/albums/albums.service';
import {GalleryCacheService} from './app/ui/gallery/cache.gallery.service';
import {ContentService} from './app/ui/gallery/content.service';
import {ContentLoaderService} from './app/ui/gallery/contentLoader.service';
import {FilterService} from './app/ui/gallery/filter/filter.service';
import {GallerySortingService} from './app/ui/gallery/navigator/sorting.service';
import {GalleryNavigatorService} from './app/ui/gallery/navigator/navigator.service';
import {MapService} from './app/ui/gallery/map/map.service';
import {BlogService} from './app/ui/gallery/blog/blog.service';
import {SearchQueryParserService} from './app/ui/gallery/search/search-query-parser.service';
import {AutoCompleteService} from './app/ui/gallery/search/autocomplete.service';
import {AuthenticationService} from './app/model/network/authentication.service';
import {ThumbnailLoaderService} from './app/ui/gallery/thumbnailLoader.service';
import {ThumbnailManagerService} from './app/ui/gallery/thumbnailManager.service';
import {NotificationService} from './app/model/notification.service';
import {FullScreenService} from './app/ui/gallery/fullscreen.service';
import {NavigationService} from './app/model/navigation.service';
import {SettingsService} from './app/ui/settings/settings.service';
import {SeededRandomService} from './app/model/seededRandom.service';
import {OverlayService} from './app/ui/gallery/overlay.service';
import {QueryService} from './app/model/query.service';
import {ThemeService} from './app/model/theme.service';
import {DuplicateService} from './app/ui/duplicates/duplicates.service';
import {FacesService} from './app/ui/faces/faces.service';
import {VersionService} from './app/model/version.service';
import {ScheduledJobsService} from './app/ui/settings/scheduled-jobs.service';
import {BackendtextService} from './app/model/backendtext.service';
import {CookieService} from 'ngx-cookie-service';
import {GPXFilesFilterPipe} from './app/pipes/GPXFilesFilterPipe';
import {MDFilesFilterPipe} from './app/pipes/MDFilesFilterPipe';
import {FileSizePipe} from './app/pipes/FileSizePipe';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {provideAnimations} from '@angular/platform-browser/animations';
import {AppRoutingModule} from './app/app.routing';
import {NgIconsModule} from '@ng-icons/core';
import {
  tablerDownload, tablerFilter, tablerGitBranch, tablerArrowDown, tablerArrowUp,
  tablerStar, tablerCalendar, tablerUser, tablerArrowsShuffle,
  tablerUsers, tablerMenu2, tablerShare, tablerPhoto, tablerLink, tablerSearch,
  tablerHammer, tablerCopy, tablerStack2, tablerSettings, tablerLogout,
  tablerChevronRight, tablerChevronDown, tablerChevronLeft, tablerChevronUp,
  tablerTrash, tablerDeviceFloppy, tablerPlus, tablerMinus, tablerTypography,
  tablerFolder, tablerFile, tablerFileText, tablerTag, tablerMapPin, tablerSun,
  tablerMoon, tablerVideo, tablerInfoCircle, tablerArrowsMinimize, tablerArrowsMaximize,
  tablerX, tablerClock, tablerPlayerPlay, tablerPlayerPause, tablerPlayerStop,
  tablerVolume, tablerVolume3, tablerCamera, tablerAlertTriangle, tablerLock,
  tablerFlag, tablerWorld, tablerChartPie, tablerCheck, tablerActivity,
  tablerArrowsDiagonal, tablerCloud, tablerMessage, tablerServer, tablerInbox,
  tablerBrush, tablerBrowser, tablerUnlink, tablerSquare, tablerLayoutGrid,
  tablerApps, tablerExternalLink, tablerRefresh, tablerPuzzle, tablerList,
  tablerPencil, tablerFingerprint, tablerCloudUpload, tablerAlertCircle,
  tablerCircleCheck, tablerLogin, tablerLayoutSidebar, tablerSparkles
} from '@ng-icons/tabler-icons';
import {ClipboardModule} from 'ngx-clipboard';
import {TooltipModule} from 'ngx-bootstrap/tooltip';
import {ToastrModule} from 'ngx-toastr';
import {ModalModule} from 'ngx-bootstrap/modal';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {PopoverModule} from 'ngx-bootstrap/popover';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {BsDatepickerModule} from 'ngx-bootstrap/datepicker';
import {TimepickerModule} from 'ngx-bootstrap/timepicker';
import {LoadingBarModule} from '@ngx-loading-bar/core';
import {LeafletModule} from '@bluehalo/ngx-leaflet';
import {LeafletMarkerClusterModule} from '@bluehalo/ngx-leaflet-markercluster';
import {MarkdownModule} from 'ngx-markdown';
import {AppComponent} from './app/app.component';
import {Marker} from 'leaflet';
import {MarkerFactory} from './app/ui/gallery/map/MarkerFactory';
import {DurationPipe} from './app/pipes/DurationPipe';
import {GalleryService} from './app/ui/gallery/gallery.service';
import {UploaderService} from './app/ui/gallery/uploader/uploader.service';

if (environment.production) {
  enableProdMode();
}

@Injectable()
export class MyHammerConfig extends HammerGestureConfig {
  events: string[] = ['pinch'];
  overrides = {
    pan: {threshold: 1},
    swipe: {direction: 31}, // enable swipe up
    pinch: {enable: true},
  };
}


export class CustomUrlSerializer implements UrlSerializer {
  private defaultUrlSerializer: DefaultUrlSerializer =
    new DefaultUrlSerializer();

  parse(url: string): UrlTree {
    // Encode parentheses
    url = url.replace(/\(/g, '%28').replace(/\)/g, '%29');
    // Use the default serializer.
    return this.defaultUrlSerializer.parse(url);
  }

  serialize(tree: UrlTree): string {
    return this.defaultUrlSerializer
      .serialize(tree)
      .replace(/%28/g, '(')
      .replace(/%29/g, ')');
  }
}

Marker.prototype.options.icon = MarkerFactory.defIcon;

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(BrowserModule, HammerModule, FormsModule, AppRoutingModule, NgIconsModule.withIcons({
        // ionicons names are kept as keys (templates unchanged) and aliased to
        // Tabler icons, so the whole UI renders with the Tabler icon set.
        ionDownloadOutline: tablerDownload,
        ionFunnelOutline: tablerFilter,
        ionGitBranchOutline: tablerGitBranch,
        ionArrowDownOutline: tablerArrowDown,
        ionArrowUpOutline: tablerArrowUp,
        ionStarOutline: tablerStar,
        ionStar: tablerStar,
        ionCalendarOutline: tablerCalendar,
        ionPersonOutline: tablerUser,
        ionShuffleOutline: tablerArrowsShuffle,
        ionPeopleOutline: tablerUsers,
        ionMenuOutline: tablerMenu2,
        ionShareSocialOutline: tablerShare,
        ionImagesOutline: tablerPhoto,
        ionLinkOutline: tablerLink,
        ionSearchOutline: tablerSearch,
        ionHammerOutline: tablerHammer,
        ionCopyOutline: tablerCopy,
        ionAlbumsOutline: tablerStack2,
        ionSettingsOutline: tablerSettings,
        ionLogOutOutline: tablerLogout,
        ionChevronForwardOutline: tablerChevronRight,
        ionChevronDownOutline: tablerChevronDown,
        ionChevronBackOutline: tablerChevronLeft,
        ionChevronUpOutline: tablerChevronUp,
        ionTrashOutline: tablerTrash,
        ionSaveOutline: tablerDeviceFloppy,
        ionAddOutline: tablerPlus,
        ionRemoveOutline: tablerMinus,
        ionTextOutline: tablerTypography,
        ionFolderOutline: tablerFolder,
        ionDocumentOutline: tablerFile,
        ionDocumentTextOutline: tablerFileText,
        ionImageOutline: tablerPhoto,
        ionPricetagOutline: tablerTag,
        ionLocationOutline: tablerMapPin,
        ionSunnyOutline: tablerSun,
        ionMoonOutline: tablerMoon,
        ionVideocamOutline: tablerVideo,
        ionInformationCircleOutline: tablerInfoCircle,
        ionInformationOutline: tablerInfoCircle,
        ionContractOutline: tablerArrowsMinimize,
        ionExpandOutline: tablerArrowsMaximize,
        ionCloseOutline: tablerX,
        ionTimerOutline: tablerClock,
        ionTimeOutline: tablerClock,
        ionPlayOutline: tablerPlayerPlay,
        ionPauseOutline: tablerPlayerPause,
        ionStopOutline: tablerPlayerStop,
        ionVolumeMediumOutline: tablerVolume,
        ionVolumeMuteOutline: tablerVolume3,
        ionCameraOutline: tablerCamera,
        ionWarningOutline: tablerAlertTriangle,
        ionLockClosedOutline: tablerLock,
        ionFlagOutline: tablerFlag,
        ionGlobeOutline: tablerWorld,
        ionPieChartOutline: tablerChartPie,
        ionCheckmarkOutline: tablerCheck,
        ionPulseOutline: tablerActivity,
        ionResizeOutline: tablerArrowsDiagonal,
        ionCloudOutline: tablerCloud,
        ionChatboxOutline: tablerMessage,
        ionServerOutline: tablerServer,
        ionFileTrayFullOutline: tablerInbox,
        ionBrushOutline: tablerBrush,
        ionBrowsersOutline: tablerBrowser,
        ionUnlinkOutline: tablerUnlink,
        ionSquareOutline: tablerSquare,
        ionGridOutline: tablerLayoutGrid,
        ionAppsOutline: tablerApps,
        ionOpenOutline: tablerExternalLink,
        ionRefresh: tablerRefresh,
        ionReload: tablerRefresh,
        ionExtensionPuzzleOutline: tablerPuzzle,
        ionList: tablerList,
        ionPencil: tablerPencil,
        ionCaretForward: tablerChevronRight,
        ionCaretDown: tablerChevronDown,
        ionFingerPrint: tablerFingerprint,
        ionCloudUploadOutline: tablerCloudUpload,
        ionAlertCircle: tablerAlertCircle,
        ionCheckmarkCircle: tablerCircleCheck,
        ionLogInOutline: tablerLogin,
        tablerLayoutSidebar: tablerLayoutSidebar,
        tablerSparkles: tablerSparkles
      }), ClipboardModule, TooltipModule.forRoot(), ToastrModule.forRoot(),
      ModalModule.forRoot(), CollapseModule.forRoot(), PopoverModule.forRoot(),
      BsDropdownModule.forRoot(), BsDatepickerModule.forRoot(), TimepickerModule.forRoot(),
      LoadingBarModule, LeafletModule, LeafletMarkerClusterModule,
      MarkdownModule.forRoot({loader: HttpClient})),
    {provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true},
    {provide: UrlSerializer, useClass: CustomUrlSerializer},
    {provide: HAMMER_GESTURE_CONFIG, useClass: MyHammerConfig},
    StringifySortingMethod,
    NetworkService,
    ShareService,
    UserService,
    AlbumsService,
    GalleryCacheService,
    ContentService,
    ContentLoaderService,
    GalleryService,
    FilterService,
    GallerySortingService,
    GalleryNavigatorService,
    MapService,
    BlogService,
    SearchQueryParserService,
    AutoCompleteService,
    AuthenticationService,
    ThumbnailLoaderService,
    ThumbnailManagerService,
    NotificationService,
    FullScreenService,
    NavigationService,
    SettingsService,
    SeededRandomService,
    OverlayService,
    QueryService,
    ThemeService,
    DuplicateService,
    FacesService,
    VersionService,
    ScheduledJobsService,
    UploaderService,
    BackendtextService,
    CookieService,
    GPXFilesFilterPipe,
    MDFilesFilterPipe,
    FileSizePipe,
    DatePipe,
    DurationPipe,
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations()
  ]
})
  .catch((err) => console.error(err));
