export type TPostgresInterval = {
  [P in 'hours' | 'days' | 'weeks' | 'months' | 'years']?: number;
}
export interface IBaseBrandFlowStep {
  is_automated: boolean;
  title: string;
  description?: string;
  order: number;
  wait_for: TPostgresInterval;
  wait_for_unit: 'hours' | 'days' | 'weeks' | 'months' | 'years';
  time: string;
  event_type: string;
  flow: UUID;
  email?: UUID;
  template?: UUID;
  template_instance?: UUID;
}

export interface IStoredBrandFlowStep extends IModel, IBaseBrandFlowStep {
  event?: UUID;
}

export interface IBrandFlowStepInput extends IBaseBrandFlowStep {
  event?: IBrandEventInput;
  event_id?: UUID;
}

export interface IPopulatedBrandFlowStep<T extends 'brand_flow.steps' | 'brand_flow_step.event' | 'brand_flow_step.email' | 'brand_flow_step.template' | 'brand_flow_step.template_instance'> {
  is_automated: boolean;
  title: string;
  description?: string;
  order: number;
  wait_for: Record<'hours' | 'days' | 'weeks' | 'months' | 'years', number>;
  event_type: string;
  flow: UUID;
  event: T extends 'brand_flow_step.event' ? IBrandEvent : never;
  email?: T extends 'brand_flow_step.event' ? IBrandEmail : never;
  template?: T extends 'brand_flow_step.template' ? any : never;
  template_instance?: T extends 'brand_flow_step.template_instance' ? import('../../Template/instance/types').IStoredTemplateInstance : never;
}
