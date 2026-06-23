import {SQLConnection} from './SQLConnection';
import {FavoriteFolderEntity} from './enitites/FavoriteFolderEntity';
import {FavoriteFolderDTO} from '../../../common/entities/FavoriteFolderDTO';
import {IObjectManager} from './IObjectManager';

export class FavoriteFolderManager implements IObjectManager {
  // No lifecycle work needed; present so the class satisfies IObjectManager
  // (whose members are all optional) and can be tracked in ObjectManagers.
  public async init(): Promise<void> {
    // no-op
  }

  public async getAll(): Promise<FavoriteFolderDTO[]> {
    const connection = await SQLConnection.getConnection();
    return await connection
      .getRepository(FavoriteFolderEntity)
      .createQueryBuilder('favoriteFolder')
      .orderBy('favoriteFolder.name', 'ASC')
      .getMany();
  }

  public async add(directoryPath: string, name: string): Promise<void> {
    const connection = await SQLConnection.getConnection();
    const repository = connection.getRepository(FavoriteFolderEntity);
    const existing = await repository.findOneBy({directoryPath});
    if (existing) {
      return;
    }
    await repository.save(repository.create({directoryPath, name}));
  }

  public async remove(directoryPath: string): Promise<void> {
    const connection = await SQLConnection.getConnection();
    await connection
      .getRepository(FavoriteFolderEntity)
      .delete({directoryPath});
  }
}
