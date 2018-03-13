declare interface Promise<T> {
  nodeify(cb: (err, res: T) => void);
}