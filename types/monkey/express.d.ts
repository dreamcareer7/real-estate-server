declare global {
  namespace Express {
      interface Request {
          user?: IUser;
      }
  }
}
