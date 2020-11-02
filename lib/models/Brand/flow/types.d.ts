export interface IBrandFlow extends IModel {
  brand: UUID;
  name: string;
  description: string;
  steps: UUID[];
  active_flows: number;
}

export interface IBrandFlowInput {
  name: string;
  description: string;
  steps: import('../flow_step/types').IBrandFlowStepInput[];
}

export interface IPopulatedBrandFlow<T extends 'brand_flow.steps' | 'brand_flow_step.event' | 'brand_flow_step.email' | 'brand_flow_step.template' | 'brand_flow_step.template_instance'> {
  brand: UUID;
  name: string;
  description: string;
  steps: T extends 'brand_flow.steps' ? import('../flow_step/types').IPopulatedBrandFlowStep<T>[] : never;
  active_flows: number;
}
