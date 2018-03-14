type TCreateError = (spec: Error | string, details?: object | string) => Error;

declare interface ErrorConstructor {
  create: TCreateError;

  Validation: TCreateError;
  Database: TCreateError;
  Unauthorized: TCreateError;
  ResourceNotFound: TCreateError;
  Forbidden: TCreateError;
  Conflict: TCreateError;
  FileSystem: TCreateError;
  Amazon: TCreateError;
  Branch: TCreateError;
  BadRequest: TCreateError;
  Generic: TCreateError;
  MethodNotAllowed: TCreateError;
  PreconditionFailed: TCreateError;
  NotImplemented: TCreateError;
  NotAcceptable: TCreateError;

  autoReport: boolean;
}