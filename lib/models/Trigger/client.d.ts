interface IRawTriggerBase {
  created_by: UUID;
  brand: UUID;
  user: UUID;
  wait_for: number;
  recurring: boolean;
}

type TContactEventTypes =
  | 'birthday'
  | 'work_anniversary'
  | 'wedding_anniversary'
  | 'home_anniversary'
  | 'child_birthday'
  ;

interface IContactTrigger {
  event_type: TContactEventTypes;
  contact: UUID;
}

interface IEventAction {
  action: 'create_event';
  brand_event: UUID;
}

type IEmailAction = {
  action: 'schedule_email';
  campaign: UUID;
}

export type IRawTrigger = IRawTriggerBase & IContactTrigger & (IEventAction | IEmailAction);

export type IStoredTrigger = IModel & IRawTrigger & {
  executed_at: number;
};
