export interface ITriggerUpdateInput {
  user: UUID;

  event_type: string;
  wait_for?: number;
  time?: string;
  recurring?: boolean;

  brand_event?: UUID;
  campaign?: UUID;

  origin?: UUID;
}

export type ITriggerEndpointInput = {
  user: UUID;

  event_type: string;
  wait_for: number;
  time?: string;
  recurring?: boolean;

  contact?: UUID;
  deal?: UUID;
} & ( IEventAction | IEmailAction );

export interface ITriggerInput {
  created_by: UUID;
  brand: UUID;
  user: UUID;

  event_type: string;
  action: 'create_event' | 'schedule_email',
  wait_for: number;
  time?: string;
  recurring?: boolean;
  effective_at?: string;

  flow?: UUID;
  flow_step?: UUID;

  brand_event?: UUID;
  campaign?: UUID;

  contact?: UUID;
  deal?: UUID;

  scheduled_after?: UUID;

  is_global?: boolean;

  origin?: UUID;
}

interface IRawTriggerBase {
  created_by: UUID;
  brand: UUID;
  user: UUID;
  wait_for: number;
  time?: string;
  recurring: boolean;
  effective_at: number;
  origin?: UUID;
}

type TContactEventTypes =
  | 'birthday'
  | 'work_anniversary'
  | 'wedding_anniversary'
  | 'home_anniversary'
  | 'child_birthday'
  ;

interface IContactTrigger {
  object_type: 'contact_attribute' | 'flow';
  trigger_object_type: 'contact';
  event_type: TContactEventTypes;
  contact: UUID;
}

interface IHolidayTrigger {
  object_type: 'holiday';
  trigger_object_type: 'holiday';
  event_type: string;
}

type TDealEventTypes =
  | 'lease_application_date'
  | 'financing_due'
  | 't47_due'
  | 'title_due'
  | 'lease_begin'
  | 'expiration_date'
  | 'list_date'
  | 'recruit_other_agent'
  | 'option_period'
  | 'hoa_delivery'
  | 'lease_end'
  | 'inspection_date'
  | 'possession_date'
  | 'home_warranty_company'
  | 'lease_executed'
  | 'closing_date'
  | 'contract_date'
  ;

interface IDealTrigger {
  object_type: 'deal_context' | 'flow';
  trigger_object_type: 'deal';
  event_type: TDealEventTypes;
  deal: UUID;
}

interface IEventAction {
  action: 'create_event';
  brand_event: UUID;
}

type IEmailAction = {
  action: 'schedule_email';
  campaign: UUID;
}

type IFlowTrigger = {
  flow: UUID;
  flow_step: UUID;
} | {
  flow: null;
  flow_step: null;
}

export type IRawTrigger = IRawTriggerBase & IFlowTrigger & (IContactTrigger | IDealTrigger | IHolidayTrigger) & (IEventAction | IEmailAction);

interface IModel {
  id: UUID;

  created_at: number;
  updated_at: number;
  deleted_at: number;

  created_by: UUID;
  contact: UUID;
  origin?: UUID;
}

type ExecutedTrigger = {
  executed_at: number;
  action: 'create_event';
  campaign: null;
  event: UUID;
} | {
  event: null;
  executed_at: number;
  action: 'schedule_email';
  campaign: UUID;
};

type PendingTrigger = {
  executed_at: null;
  event: null;
  failed_at: null;
  failure: null;
} & ({
  action: 'create_event';
  campaign: null;
} | {
  action: 'schedule_email';
  campaign: UUID;
});

interface FailedTrigger {
  failed_at: number;
  failure: string;
}

export type IStoredTrigger = IModel & IRawTrigger & (ExecutedTrigger | PendingTrigger);
export type TIsTriggerExecuted = (x: IStoredTrigger) => x is (IModel & IRawTrigger & ExecutedTrigger)

export type IDueTrigger = IStoredTrigger & {
  timestamp: number;
  due_at: number;
}

export interface ITriggerFilterParams {
  contact?: UUID;
  flow?: UUID;
  flow_step?: UUID;
  deal?: UUID;
}
