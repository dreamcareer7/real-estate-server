export interface IStoredBrandFlowStep extends IModel {
  is_automated: boolean;
  title: string;
  description?: string;
  due_in: number;
  flow: UUID;
  event?: UUID;
  email?: UUID;
  template?: UUID;
  template_instance?: UUID;
}
