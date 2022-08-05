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
  first_name: string;
  last_name: string;
  company: string;
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

export interface ShowingAppointment extends Omit<IModel, 'deleted_at' | 'created_by' | 'updated_by'> {
  type: 'showing_appointment';
  source: string;
  time: Date;
  status: AppointmentStatus;
  showing: UUID;
  contact: UUID;
  approvals: UUID[] | null;
  feedback: AppointmentFeedback | null;
  buyer_message: string | null;
  email: string | null;
  phone_number: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
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

export interface ShowingAppointmentPopulated extends Omit<ShowingAppointment, 'showing' | 'contact' | 'approvals'>{
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
