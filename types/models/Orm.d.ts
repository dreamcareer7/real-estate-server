declare interface IModel {
    type: String;
    id: UUID;
    created_at: number;
    updated_at?: number;

    publicize(options?: any): any;
}