import { TShowingRole } from '../role/types';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'
  ;

export type AppointmentStatus =
  | 'Pending'
  | 'Approved'
  | 'NeedsRescheduling'
  | 'Rescheduled'
  | 'Cancelled'
  | 'Finished'
  ;

export type ApprovalType =
  | 'All'
  | 'Any'
  | 'None'
  ;

export interface ShowingRole {
  id: UUID;
  created_at: number;
  updated_at: number;
  deleted_at: number;
  created_by: number;
  showing: UUID;
  role: TShowingRole;
  user: UUID;
  brand: UUID;
  can_approve: boolean;
  confirm_notification_type: TNotificationDeliveryType[];
  cancel_notification_type: TNotificationDeliveryType[];
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;

  type: 'showing_role';
}

export interface ShowingApproval {
  id: UUID;
  created_at: number;
  updated_at: number;
  appointment: UUID;
  role: UUID;
  approved: boolean;
  time: string;
  comment?: string;

  type: 'showing_approval';
}

export interface ShowingAvailability {
  id: UUID;
  showing: UUID;
  weekday: DayOfWeek;
  // A half-closed range [lower, upper)
  availability: [number, number];
  type: 'showing_availability';
}

export interface ShowingAvailabilityInput {
  weekday: DayOfWeek;
  // A half-closed range [lower, upper)
  availability: [number, number];
}

export interface ShowingAppointment {
  id: UUID;
  created_at: number;
  updated_at: number;
  // A simple string for now. later we wanna capture the lead source with this
  source: string;
  time: string;
  status: AppointmentStatus;
  showing: UUID;
  contact: IContact;
  approvals?: ShowingApproval[];

  type: 'showing_appointment';
}

export interface ShowingRoleInput {
  // The same deal role enum
  role: TShowingRole;
  user: UUID;
  brand: UUID;
  can_approve: boolean;
  confirm_notification_type: TNotificationDeliveryType[];
  cancel_notification_type: TNotificationDeliveryType[];
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

export interface Showing {
  id: UUID;
  created_at: number;
  updated_at: number;
  created_by: UUID;
  brand: UUID;
  aired_at?: number;
  start_date: string;
  end_date?: string;
  duration: number;
  notice_period?: number;
  aired_at?: number;
  approval_type: ApprovalType;
  allow_appraisal: boolean;
  allow_inspection: boolean;
  instructions?: string;
  feedback_template?: TemplateInstance;
  deal?: Deal;
  listing?: Listing;
  address?: StdAddr;
  gallery?: Gallery;

  roles: ShowingRole[];
  availabilities: ShowingAvailability[];
  appointments: ShowingAppointment[];

  type: 'showing';
}

export interface ShowingInput {
  start_date: string;
  end_date?: string;
  duration: number;
  notice_period?: number;
  aired_at?: number;
  approval_type: ApprovalType;
  allow_appraisal: boolean;
  allow_inspection: boolean;
  instructions?: string;
  feedback_template?: UUID;
  deal?: UUID;
  listing?: UUID;
  address?: StdAddr;
  gallery?: UUID;

  roles: ShowingRoleInput[];
  availabilities: ShowingAvailabilityInput[];
}

export interface ShowingFilterOptions {
  deal?: UUID;
  listing?: UUID;
  live?: boolean;
}

export interface AppointmentFilterOptions {
  brand: UUID;
  status?: AppointmentStatus;
}
