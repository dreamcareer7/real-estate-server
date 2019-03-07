declare interface IFlowStepInput {
  flow: UUID;
  origin: UUID;
  contact: UUID;
  event?: UUID;
}

declare interface IFlowEventInput {
  origin: UUID;
  due_date: number;
  contact: UUID;
}
