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
