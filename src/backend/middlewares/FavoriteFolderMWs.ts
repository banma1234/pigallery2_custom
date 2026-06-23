import {NextFunction, Request, Response} from 'express';
import {ErrorCodes, ErrorDTO} from '../../common/entities/Error';
import {ObjectManagers} from '../model/ObjectManagers';

export class FavoriteFolderMWs {
  public static async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      req.resultPipe =
        await ObjectManagers.getInstance().FavoriteFolderManager.getAll();
      return next();
    } catch (err) {
      return next(
        new ErrorDTO(ErrorCodes.GENERAL_ERROR, 'Error during listing favorite folders', err)
      );
    }
  }

  public static async add(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (
      typeof req.body === 'undefined' ||
      typeof req.body.directoryPath !== 'string' ||
      typeof req.body.name !== 'string'
    ) {
      return next(
        new ErrorDTO(ErrorCodes.INPUT_ERROR, 'directoryPath and name are required')
      );
    }
    try {
      await ObjectManagers.getInstance().FavoriteFolderManager.add(
        req.body.directoryPath,
        req.body.name
      );
      req.resultPipe = 'ok';
      return next();
    } catch (err) {
      return next(
        new ErrorDTO(ErrorCodes.GENERAL_ERROR, 'Error during adding favorite folder', err)
      );
    }
  }

  public static async remove(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const directoryPath = req.query['path'];
    if (typeof directoryPath !== 'string') {
      return next(
        new ErrorDTO(ErrorCodes.INPUT_ERROR, 'path query parameter is required')
      );
    }
    try {
      await ObjectManagers.getInstance().FavoriteFolderManager.remove(directoryPath);
      req.resultPipe = 'ok';
      return next();
    } catch (err) {
      return next(
        new ErrorDTO(ErrorCodes.GENERAL_ERROR, 'Error during removing favorite folder', err)
      );
    }
  }
}
