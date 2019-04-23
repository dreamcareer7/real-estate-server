import * as express from 'express-serve-static-core';

interface IAuthBearer {
  (fn: (...args: any[]) => any): express.RequestHandler;

  middleware: express.RequestHandler;
}

declare interface IRechatApp extends express.Router {
  auth: {
    bearer: IAuthBearer;
  }
}

declare interface IRequest<TParams = {}, TQuery = {}, TBody = null> extends express.Request {
  params: TParams;
  query: TQuery;
  body: TBody;
}

declare interface IAuthenticatedRequest<TParams = {}, TQuery = {}, TBody = null> extends IRequest<TParams, TQuery, TBody> {
  user: IUser;
}

declare interface IResponse extends express.Response {
  collection(models: any[]);
  model(model: any);
}
