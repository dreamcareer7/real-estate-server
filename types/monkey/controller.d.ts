import { Request, Response, RequestHandler, Router } from 'express-serve-static-core';

interface IAuthBearer {
  (fn: (...args: any[]) => any): RequestHandler;

  middleware: RequestHandler;
}

declare interface IRechatApp extends Router {
  auth: {
    bearer: IAuthBearer;
  }
}

declare interface IRequest<TParams = {}, TQuery = {}, TBody = null> extends Request<TParams, unknown, TBody, TQuery> {
  params: TParams;
  query: TQuery;
  body: TBody;
}

declare interface IAuthenticatedRequest<TParams = {}, TQuery = {}, TBody = null> extends IRequest<TParams, TQuery, TBody> {
  user: IUser;
}

declare interface IResponse extends Response {
  collection(models: any[]);
  model(model: any);
  error(err: unknown);
}
