export interface IStoredFlow extends IModel {
  origin: UUID;
  origin_id: UUID;
  starts_at: number;
  contact: UUID;
  brand: UUID;
  name: string;
  description?: string;
  steps: UUID[];
}
