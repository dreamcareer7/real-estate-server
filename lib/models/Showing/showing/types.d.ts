import { ShowingAppointment } from "../appointment/types";
import { ShowingAvailabilityInput, ShowingAvailabilityPopulated } from "../availability/types";
import { ShowingRoleInput, ShowingRolePopulated } from "../role/types";

export type ApprovalType =
  | 'All'
  | 'Any'
  | 'None'
  ;

export interface Showing extends IModel {
  brand: UUID;
  human_readable_id: number;
  title: string;
  slug: string;
  aired_at?: number;
  start_date: string;
  end_date?: string;
  duration: number;
  same_day_allowed: boolean;
  notice_period?: number;
  approval_type: ApprovalType;
  feedback_template?: UUID;
  deal?: UUID;
  listing?: UUID;
  address?: StdAddr;
  gallery?: UUID;

  roles: UUID[];
  availabilities: UUID[];
  appointments: UUID[];

  confirmed: number;
  visits: number;

  instructions: string | null;
}

export interface ShowingPublic {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  end_date?: string;
  duration: number;
  same_day_allowed: boolean;
  notice_period?: number;
  agent: UUID;
  listing?: UUID;
  unavailable_times: string[];
  availabilities: UUID[];
  address?: StdAddr;
  gallery?: UUID;
  timezone: string;
  timezone_offset?: number;
}

export interface ShowingPopulated extends IModel {
  brand: UUID;
  human_readable_id: number;
  title: string;
  slug: string;
  aired_at?: number;
  start_date: string;
  end_date?: string;
  duration: number;
  notice_period?: number;
  approval_type: ApprovalType;
  feedback_template?: UUID;
  deal?: IDeal;
  listing?: IListing;
  address?: StdAddr;
  gallery?: UUID;

  roles: ShowingRolePopulated[];
  availabilities: ShowingAvailabilityPopulated[];
  appointments: ShowingAppointment[];
}

export interface ShowingInput {
  brand?: UUID;
  start_date: string;
  end_date?: string;
  duration: number;
  same_day_allowed: boolean;
  notice_period?: number;
  aired_at?: string;
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
  brand?: UUID;
  parentBrand?: IBrand['id'];
  deal?: UUID;
  listing?: UUID;
  live?: boolean;
  query?: string;
}
