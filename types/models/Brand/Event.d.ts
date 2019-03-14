declare interface IBrandEvent extends IModel {
  created_by: UUID;
  updated_by: UUID;
  brand: UUID;
  title: string;
  description?: string;
  task_type: TTaskType;
  reminder?: number;
}

declare interface IBrandEventInput {
  title: string;
  description?: string;
  task_type: string;
  reminder?: number;
}
