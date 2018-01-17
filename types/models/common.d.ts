declare type UUID = String;
declare type Callback<R> = (err?: any, res?: R) => void;
declare interface IModelAssociation {
    collection?: boolean;
    enabled?: boolean;
    optional?: boolean;
    model: String;
}

declare interface Map<T> {
    [key: string]: T;
}