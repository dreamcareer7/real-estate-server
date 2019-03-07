declare interface IBrandEvent extends IModel {
  id: UUID;
  created_at: number;
  updated_at: number;
  created_by: UUID;
  updated_by: UUID;
  brand: UUID;
  title: string;
  description: string;
  task_type: string;
  reminder: number;
}

declare interface IBrandEventInput extends IModel {
  title: string;
  description: string;
  task_type: string;
  reminder: number;
}
