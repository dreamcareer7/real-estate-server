export interface IStoredFlowStep extends IModel {
  executed_at?: number;
  deleted_by: UUID;
  flow: UUID;
  origin: UUID;

  /** @todo this field was renamed from 'email' */
  campaign?: UUID;
  crm_task?: UUID;
}

export interface IFlowStepInput {
  created_by: UUID;
  flow: UUID;
  origin: UUID;
}
