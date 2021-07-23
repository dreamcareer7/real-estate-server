export interface IStoredFlow extends IModel {
  origin: UUID;
  origin_id: UUID;
  starts_at: number;
  contact: UUID;
  last_step_date: number;
  brand: UUID;
  name: string;
  description?: string;
  steps: UUID[];
}

export interface IPopulatedFlow extends IModel {
  origin: import('../Brand/flow/types').IBrandFlow;
  origin_id: UUID;
  starts_at: number;
  contact: IContact;
  brand: UUID;
  name: string;
  description?: string;
  steps: import('./step/types').IStoredFlowStep[];
}
