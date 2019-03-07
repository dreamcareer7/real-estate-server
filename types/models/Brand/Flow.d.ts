declare interface IBrandFlowStep {
  id: UUID;
  created_at: number;
  updated_at: number;
  created_by: UUID;
  updated_by: UUID;
  title: string;
  description: string;
  due_in: number;
  flow: UUID;
  event: UUID;
}

declare interface IBrandFlowStepInput {
  title: string;
  description?: string;
  due_in: number;
  flow: UUID;
  event?: IBrandEvent;
  event_id?: UUID;
}

declare interface IBrandFlow {
  id: UUID;
  created_at: number;
  updated_at: number;
  created_by: UUID;
  updated_by: UUID;
  brand: UUID;
  name: string;
  description: string;
}

declare interface IBrandFlowInput {
  brand: UUID;
  name: string;
  description: string;
  steps: IBrandFlowStepInput[];
}
