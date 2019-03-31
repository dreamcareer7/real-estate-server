declare type UUID = string;
declare type Callback<R> = (err?: any, res?: R) => void;
declare interface IModelAssociation {
    collection?: boolean;
    enabled?: boolean;
    optional?: boolean;
    model: string;
}

declare interface StringMap<T> {
    [key: string]: T;
}

declare interface PaginationOptions {
    start?: number;
    limit?: number;
    order?: string;
}

declare interface IIdCollectionResponse {
    total: number;
    ids: UUID[];
}

declare type RequireProp<T, K extends keyof T> = {
  [P in K]-?: T[K];
} & T;
declare type TIsPropertyPresent<T, P extends T, K extends keyof P> = (x: T) => x is P;
declare type TIsRequirePropPresent<T, K extends keyof T> = TIsPropertyPresent<T, T & RequireProp<T, K>, K>;

declare type TCallback<T> = 
  | ((err: any) => void)
  | ((err: null, res: T) => void)
