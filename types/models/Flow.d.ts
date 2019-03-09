declare interface IFlowStepInput {
  flow: UUID;
  origin: UUID;
  contact: UUID;
  event?: UUID;
  email?: UUID;
}

declare interface IFlowEventInput {
  origin: UUID;
  due_date: number;
  contact: UUID;
}

declare interface IFlowEmailInput {
  origin: UUID;
  due_date: number;
  contact: UUID;
  is_automated: boolean;
  event_title?: string;
}
