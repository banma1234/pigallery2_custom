import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {NetworkService} from './network/network.service';
import {FavoriteFolderDTO} from '../../../common/entities/FavoriteFolderDTO';

@Injectable({
  providedIn: 'root',
})
export class FavoriteFolderService {
  public readonly favorites = new BehaviorSubject<FavoriteFolderDTO[]>([]);
  private loaded = false;

  constructor(private networkService: NetworkService) {}

  public async load(force = false): Promise<void> {
    if (this.loaded && !force) {
      return;
    }
    const list = await this.networkService.getJson<FavoriteFolderDTO[]>('/favorite-folders');
    this.loaded = true;
    this.favorites.next(list || []);
  }

  public isFavorite(directoryPath: string): boolean {
    return (this.favorites.value || []).some(
      (f): boolean => f.directoryPath === directoryPath
    );
  }

  public async add(directoryPath: string, name: string): Promise<void> {
    await this.networkService.putJson('/favorite-folders', {directoryPath, name});
    await this.load(true);
  }

  public async remove(directoryPath: string): Promise<void> {
    await this.networkService.deleteJson(
      '/favorite-folders?path=' + encodeURIComponent(directoryPath)
    );
    await this.load(true);
  }

  public async toggle(directoryPath: string, name: string): Promise<void> {
    if (this.isFavorite(directoryPath)) {
      await this.remove(directoryPath);
    } else {
      await this.add(directoryPath, name);
    }
  }
}
