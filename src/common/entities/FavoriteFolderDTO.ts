export interface FavoriteFolderDTO {
  id: number;
  // full directory path (parent path + folder name), as used by the gallery router
  directoryPath: string;
  // display name of the folder
  name: string;
}
