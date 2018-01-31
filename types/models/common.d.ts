declare type UUID = String;
declare type Callback<R> = (err?: any, res?: R) => void;
declare interface IModelAssociation {
    collection?: boolean;
    enabled?: boolean;
    optional?: boolean;
    model: String;
}

declare interface StringMap<T> {
    [key: string]: T;
}

declare interface PaginationOptions {
    start?: number;
    size?: number;
}