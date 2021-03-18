export interface ShowingApproval {
  id: UUID;
  created_at: number;
  updated_at: number;
  appointment: UUID;
  role: UUID;
  approved: boolean;
  time: string;
  comment?: string;
}
