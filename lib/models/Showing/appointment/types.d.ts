import { ILtsLead } from "../../Contact/lead/types";
import { ShowingApproval } from "../approval/types";
import { ShowingPopulated } from "../showing/types";

export interface ShowingAppointmentInput {
  source: string;
  time: string;
  contact: UUID;
  status: AppointmentStatus;
  email: string;
  phone_number: string;
}

export interface ShowingAppointmentRequestPayload {
  source: string;
  time: string;
  contact: ILtsLead;
}

export interface AppointmentFeedback {
  questions: string[];
  answers: string[];
  comment?: string;
}

export interface ShowingAppointment {
  id: UUID;
  created_at: number;
  updated_at: number;
  source: string;
  time: Date;
  status: AppointmentStatus;
  showing: UUID;
  contact: UUID;
  approvals: UUID[] | null;
  feedback: AppointmentFeedback | null;
  buyer_message: string | null;
  email: string;
}

export interface ShowingAppointmentPublic {
  id: UUID;
  created_at: number;
  updated_at: number;
  time: string;
  status: AppointmentStatus;
  showing: UUID;
  buyer_message: string | null;
  role_message: string | null;
}

export interface ShowingAppointmentPopulated {
  id: UUID;
  created_at: number;
  updated_at: number;
  source: string;
  time: Date;
  status: AppointmentStatus;
  showing: ShowingPopulated;
  contact: IContact;
  approvals?: ShowingApproval[];
  buyer_message: string | null;
  email: string;
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
