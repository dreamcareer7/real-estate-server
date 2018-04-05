type TCreateError = (spec: Error, details?: object | string) => Error;
type TBoundCreateError = (details?: object | string) => Error;
declare interface ErrorConstructor {
  create: TCreateError;

  Validation: TBoundCreateError;
  Database: TBoundCreateError;
  Unauthorized: TBoundCreateError;
  ResourceNotFound: TBoundCreateError;
  Forbidden: TBoundCreateError;
  Conflict: TBoundCreateError;
  FileSystem: TBoundCreateError;
  Amazon: TBoundCreateError;
  Branch: TBoundCreateError;
  BadRequest: TBoundCreateError;
  Generic: TBoundCreateError;
  MethodNotAllowed: TBoundCreateError;
  PreconditionFailed: TBoundCreateError;
  NotImplemented: TBoundCreateError;
  NotAcceptable: TBoundCreateError;

  autoReport: boolean;
}