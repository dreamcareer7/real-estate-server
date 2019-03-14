declare interface IBrandEmail extends IModel {
  created_by: UUID;
  updated_by: UUID;
  brand: UUID;
  name: string;
  goal: string;
  subject: string;
  include_signature: boolean;
  body: string;
}

declare interface IBrandEmailInput {
  name: string;
  goal: string;
  subject: string;
  include_signature: boolean;
  body: string;
}
