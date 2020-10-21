export interface IStoredFlowStep extends IModel {
  deleted_by: UUID;
  flow: UUID;
  origin: UUID;

  /** @todo this field was renamed from 'email' */
  campaign: UUID;
  crm_task: UUID;
}
