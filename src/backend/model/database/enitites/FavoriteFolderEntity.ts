import {Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';
import {columnCharsetCS} from './EntityUtils';
import {FavoriteFolderDTO} from '../../../../common/entities/FavoriteFolderDTO';

@Entity()
export class FavoriteFolderEntity implements FavoriteFolderDTO {
  @PrimaryGeneratedColumn({unsigned: true})
  id: number;

  // uniqueness is enforced in FavoriteFolderManager (avoids long-varchar
  // unique-index key-length issues on MySQL); indexed for fast lookups.
  @Index()
  @Column(columnCharsetCS)
  directoryPath: string;

  @Column(columnCharsetCS)
  name: string;
}
