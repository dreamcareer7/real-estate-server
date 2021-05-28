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
  email: UUID;
  is_automated: boolean;
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
  steps: UUID[];
  active_flows: number;
}

// declare interface IBrandFlowInput {
//   name: string;
//   description: string;
//   steps: IBrandFlowStepInput[];
// }
