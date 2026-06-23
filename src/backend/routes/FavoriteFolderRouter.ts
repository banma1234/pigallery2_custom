import {AuthenticationMWs} from '../middlewares/user/AuthenticationMWs';
import {Express} from 'express';
import {RenderingMWs} from '../middlewares/RenderingMWs';
import {UserRoles} from '../../common/entities/UserDTO';
import {ServerTimingMWs} from '../middlewares/ServerTimingMWs';
import {Config} from '../../common/config/private/Config';
import {FavoriteFolderMWs} from '../middlewares/FavoriteFolderMWs';

export class FavoriteFolderRouter {
  public static route(app: Express): void {
    this.addList(app);
    this.addAdd(app);
    this.addRemove(app);
  }

  private static addList(app: Express): void {
    app.get(
      [Config.Server.apiPath + '/favorite-folders'],
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.User),

      FavoriteFolderMWs.list,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderResult
    );
  }

  private static addAdd(app: Express): void {
    app.put(
      [Config.Server.apiPath + '/favorite-folders'],
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.User),

      FavoriteFolderMWs.add,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderResult
    );
  }

  private static addRemove(app: Express): void {
    app.delete(
      [Config.Server.apiPath + '/favorite-folders'],
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.User),

      FavoriteFolderMWs.remove,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderResult
    );
  }
}
