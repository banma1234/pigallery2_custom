import {Component, EventEmitter, HostBinding, Input, OnChanges, OnInit, Output,} from '@angular/core';
import {CameraMetadata, PhotoDTO, PhotoMetadata, PositionMetaData,} from '../../../../../../common/entities/PhotoDTO';
import {Config} from '../../../../../../common/config/public/Config';
import {MediaDTO, MediaDTOUtils,} from '../../../../../../common/entities/MediaDTO';
import {VideoDTO, VideoMetadata,} from '../../../../../../common/entities/VideoDTO';
import {Utils} from '../../../../../../common/Utils';
import {QueryService} from '../../../../model/query.service';
import {MapService} from '../../map/map.service';
import {
  ANDSearchQuery,
  DistanceSearch, DateSearch,
  SearchQueryTypes,
  TextSearch,
  TextSearchQueryMatchTypes,
} from '../../../../../../common/entities/SearchQueryDTO';
import {AuthenticationService} from '../../../../model/network/authentication.service';
import {LatLngLiteral, marker, Marker, TileLayer, tileLayer} from 'leaflet';
import {ThemeService} from '../../../../model/theme.service';
import {ContentLoaderService} from '../../contentLoader.service';
import {NgIf, NgFor, NgSwitch, NgSwitchCase, DatePipe} from '@angular/common';
import {NgIconComponent} from '@ng-icons/core';
import {RouterLink} from '@angular/router';
import {LeafletModule} from '@bluehalo/ngx-leaflet';
import {DurationPipe} from '../../../../pipes/DurationPipe';
import {FileSizePipe} from '../../../../pipes/FileSizePipe';
import {SearchQueryUtils} from '../../../../../../common/SearchQueryUtils';
import {FormsModule} from '@angular/forms';
import {LightboxService} from '../lightbox.service';
import {AIService} from '../../../../model/ai.service';
import {AIMetadata, AIMetadataSource} from '../../../../../../common/entities/AIMetadata';

@Component({
  selector: 'app-info-panel',
  styleUrls: ['./info-panel.lightbox.gallery.component.css'],
  templateUrl: './info-panel.lightbox.gallery.component.html',
  imports: [
    NgIf,
    NgIconComponent,
    RouterLink,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    LeafletModule,
    DatePipe,
    DurationPipe,
    FileSizePipe,
    FormsModule,
  ]
})
export class InfoPanelLightboxComponent implements OnInit, OnChanges {
  @Input() media: MediaDTO;
  // bottom-sheet mode (tablet & phone); when false the panel is right-docked
  @Input() sheet = false;
  @Input() downloadUrl: string;
  @Input() downloadName: string;
  @Output() closed = new EventEmitter();
  // close the whole lightbox (footer X)
  @Output() requestClose = new EventEmitter();

  // sheet expand/collapse state (only used in sheet mode)
  public sheetExpanded = false;
  public readonly playBackDurations = [1, 2, 5, 10, 15, 20, 30, 60];

  @HostBinding('class.sheet') get hostSheet(): boolean {
    return this.sheet;
  }

  @HostBinding('class.docked') get hostDocked(): boolean {
    return !this.sheet;
  }

  @HostBinding('class.sheet-expanded') get hostSheetExpanded(): boolean {
    return this.sheet && this.sheetExpanded;
  }

  public readonly mapEnabled: boolean;
  public readonly searchEnabled: boolean;
  public keywords: { value: string; type: SearchQueryTypes }[] = null;
  public readonly SearchQueryTypes: typeof SearchQueryTypes = SearchQueryTypes;

  public baseLayer: TileLayer;
  public markerLayer: Marker[] = [];

  constructor(
    public queryService: QueryService,
    public contentLoaderService: ContentLoaderService,
    public mapService: MapService,
    private authService: AuthenticationService,
    private themeService: ThemeService,
    public lightboxService: LightboxService,
    public aiService: AIService
  ) {
    this.mapEnabled = Config.Map.enabled;
    this.searchEnabled = this.authService.canSearch();
    if (this.themeService.darkMode.value) {
      this.baseLayer = tileLayer(mapService.DarkMapLayer.url, {
        attribution: mapService.ShortAttributions,
      });
    } else {
      this.baseLayer = tileLayer(mapService.MapLayer.url, {
        attribution: mapService.ShortAttributions,
      });
    }
  }

  get FullPath(): string {
    return Utils.concatUrls(
      this.media.directory.path,
      this.media.directory.name,
      this.media.name
    );
  }

  get DirectoryPath(): string {
    return Utils.concatUrls(
      this.media.directory.path,
      this.media.directory.name
    );
  }

  get DirectoryPathStr(): string {
    const p = this.DirectoryPath;
    if (p === '.') {
      return $localize`Home`;
    }
    if (p.length > 25) {
      return '...' + p.slice(-22);
    }
    return p;
  }

  get VideoData(): VideoMetadata {
    if (typeof (this.media as VideoDTO).metadata.bitRate === 'undefined') {
      return null;
    }
    return (this.media as VideoDTO).metadata;
  }

  get Rating(): number {
    return (this.media as PhotoDTO).metadata.rating;
  }

  get PositionData(): PositionMetaData {
    return (this.media as PhotoDTO).metadata.positionData;
  }

  get CameraData(): CameraMetadata {
    return (this.media as PhotoDTO).metadata.cameraData;
  }

  // --- AI generation metadata ---
  get ai(): AIMetadata {
    return (this.media as PhotoDTO).metadata.aiMetadata;
  }

  get aiVisible(): boolean {
    return this.aiService.enabled.value && !!this.ai;
  }

  get isAIGenerated(): boolean {
    return !!(this.media as PhotoDTO).metadata.isAIGenerated;
  }

  // AI mode on, but this image is flagged as NOT AI-generated
  get aiNotGenerated(): boolean {
    return this.aiService.enabled.value && !this.ai && !this.isAIGenerated;
  }

  // AI mode on, image is AI-generated, but no structured metadata was parsed
  get aiNoMetadata(): boolean {
    return this.aiService.enabled.value && !this.ai && this.isAIGenerated;
  }

  get aiSourceLabel(): string {
    switch (this.ai?.source) {
      case AIMetadataSource.comfy:
        return 'ComfyUI';
      case AIMetadataSource.novelai:
        return 'NovelAI';
      case AIMetadataSource.basic:
        return 'Stable Diffusion';
      default:
        return '';
    }
  }

  private get aiData(): any {
    const a = this.ai;
    return a ? a.basic || a.comfy || a.novelai || {} : {};
  }

  get aiPrompt(): string {
    return this.aiData.prompt;
  }

  get aiNegative(): string {
    return this.aiData.negativePrompt;
  }

  get aiFields(): { label: string; value: string }[] {
    const d = this.aiData;
    const out: { label: string; value: string }[] = [];
    const push = (label: string, val: unknown): void => {
      if (val !== undefined && val !== null && val !== '') {
        out.push({label, value: String(val)});
      }
    };
    push($localize`Model`, d.model);
    push($localize`Seed`, d.seed);
    push($localize`Steps`, d.steps);
    push($localize`Sampler`, d.sampler);
    push($localize`CFG`, d.cfgScale ?? d.scale);
    push($localize`Scheduler`, d.scheduler);
    push($localize`Noise`, d.noiseSchedule);
    if (d.width && d.height) {
      push($localize`Size`, d.width + ' × ' + d.height);
    }
    return out;
  }

  ngOnChanges(): void {
    if (this.hasGPS()) {
      this.markerLayer = [
        marker({
          lat: this.PositionData.GPSData.latitude,
          lng: this.PositionData.GPSData.longitude,
        } as LatLngLiteral),
      ];
    }
  }

  ngOnInit(): void {
    const metadata = this.media.metadata as PhotoMetadata;
    if (
      (metadata.keywords && metadata.keywords.length > 0) ||
      (metadata.faces && metadata.faces.length > 0)
    ) {
      this.keywords = [];
      if (Config.Faces.enabled) {
        const names: string[] = (metadata.faces || []).map(
          (f): string => f.name
        );
        this.keywords = names
          .filter((name, index): boolean => names.indexOf(name) === index)
          .map((n): { type: SearchQueryTypes; value: string } => ({
            value: n,
            type: SearchQueryTypes.person,
          }));
      }
      this.keywords = this.keywords.concat(
        (metadata.keywords || []).map(
          (k): { type: SearchQueryTypes; value: string } => ({
            value: k,
            type: SearchQueryTypes.keyword,
          })
        )
      );
    }
  }

  isPhoto(): boolean {
    return this.media && MediaDTOUtils.isPhoto(this.media);
  }

  isLivePhoto(): boolean {
    return !!this.media?.liveVideoPath;
  }

  calcMpx(): string {
    return (
      (this.media.metadata.size.width * this.media.metadata.size.height) /
      1000000
    ).toFixed(2);
  }

  isThisYear(): boolean {
    return MediaDTOUtils.createdThisYear(this.media);
  }

  toFraction(f: number): string | number {
    if (f > 1) {
      return f;
    }
    return '1/' + Math.round(1 / f);
  }

  hasTextPositionData(): boolean {
    return this.getPositionParts().length > 0;
  }

  hasGPS(): boolean {
    return !!(
      (this.media as PhotoDTO).metadata.positionData &&
      (this.media as PhotoDTO).metadata.positionData.GPSData &&
      (this.media as PhotoDTO).metadata.positionData.GPSData.latitude &&
      (this.media as PhotoDTO).metadata.positionData.GPSData.longitude
    );
  }

  getPositionText(): string {
    return this.getPositionParts().join(', ').trim(); //Filter removes empty elements, join concats the values separated by ', '
  }

  getPositionParts(): string[] {
    if (!this.PositionData) {
      return [];
    }
    return [
      this.PositionData.city,
      this.PositionData.state,
      this.PositionData.country
    ].filter(text => !!text);
  }

  close(): void {
    this.closed.emit();
  }

  toggleSheet(): void {
    this.sheetExpanded = !this.sheetExpanded;
  }

  getTextSearchQuery(name: string, type: SearchQueryTypes): string {
    return SearchQueryUtils.urlify({
      type,
      matchType: TextSearchQueryMatchTypes.exact_match,
      value: name,
    } as TextSearch);
  }

  getDistanceSearchQuery(): string {
    return SearchQueryUtils.urlify({
      type: SearchQueryTypes.distance,
      from: {
        GPSData: {
          latitude: this.PositionData.GPSData.latitude,
          longitude: this.PositionData.GPSData.longitude
        }
      },
      distance: 1 // 1km radius
    } as DistanceSearch);
  }

  getDateSearchQuery(): string {
    // Search for photos taken on the same date (within 24 hours)
    const creationDate = new Date(this.media.metadata.creationDate);
    const startOfDay = new Date(creationDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(creationDate);
    endOfDay.setHours(23, 59, 59, 999);

    return SearchQueryUtils.urlify({
      type: SearchQueryTypes.date,
      min: startOfDay.getTime(),
      max: endOfDay.getTime()
    } as DateSearch);
  }

}
