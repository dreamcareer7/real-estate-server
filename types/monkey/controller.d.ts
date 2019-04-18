declare interface IRequest<P = {}, Q = {}, B = null> extends Express.Request {
  params: P;
  query: Q;
  body: B;
}
