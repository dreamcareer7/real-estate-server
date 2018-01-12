declare interface IModel {
    type: String;
    id: String;
    created_at: number;
    updated_at?: number;

    publicize(options?: any): any;
}