declare interface IModel {
    type: string;
    id: UUID;
    created_at: number;
    updated_at?: number;
    deleted_at?: number;
}