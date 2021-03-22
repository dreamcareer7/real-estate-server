export interface ShowingAppointment {
  id: UUID;
  created_at: number;
  updated_at: number;
  source: string;
  time: string;
  status: AppointmentStatus;
  showing: UUID;
  contact: UUID;
  approvals?: UUID[];
}

export type AppointmentStatus =
  | 'Pending'
  | 'Approved'
  | 'NeedsRescheduling'
  | 'Rescheduled'
  | 'Cancelled'
  | 'Finished'
  ;

export interface AppointmentFilterOptions {
  brand: UUID;
  status?: AppointmentStatus;
}
