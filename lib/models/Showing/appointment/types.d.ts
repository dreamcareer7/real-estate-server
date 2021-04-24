import { ILtsLead } from "../../Contact/lead/types";
import { ShowingApproval } from "../approval/types";
import { ShowingPopulated } from "../showing/types";

export interface ShowingAppointmentInput {
  source: string;
  time: string;
  contact: UUID;
  status: AppointmentStatus;
}

export interface ShowingAppointmentRequestPayload {
  source: string;
  time: string;
  contact: ILtsLead;
}

export interface ShowingAppointment {
  id: UUID;
  created_at: number;
  updated_at: number;
  source: string;
  time: string;
  status: AppointmentStatus;
  showing: UUID;
  contact: UUID;
  approvals: UUID[] | null;
}

export interface ShowingAppointmentPublic {
  id: UUID;
  created_at: number;
  updated_at: number;
  time: string;
  status: AppointmentStatus;
  showing: UUID;
}

export interface ShowingAppointmentPopulated {
  id: UUID;
  created_at: number;
  updated_at: number;
  source: string;
  time: string;
  status: AppointmentStatus;
  showing: ShowingPopulated;
  contact: IContact;
  approvals?: ShowingApproval[];
}

export type AppointmentStatus =
  | 'Requested'
  | 'Confirmed'
  | 'Rescheduled'
  | 'Canceled'
  | 'Completed'
  ;

export interface AppointmentFilterOptions {
  brand: UUID;
  status?: AppointmentStatus;
}

export interface AppointmentToken {
  id: UUID;
  time: string;
  contact: UUID;
}
