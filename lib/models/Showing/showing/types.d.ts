import { ShowingAvailabilityInput } from "../availability/types";
import { ShowingRoleInput } from "../role/types";

interface StdAddr {

}

export type ApprovalType =
  | 'All'
  | 'Any'
  | 'None'
  ;

export interface Showing extends IModel {
  brand: UUID;
  aired_at?: number;
  start_date: string;
  end_date?: string;
  duration: number;
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
}

export interface ShowingInput {
  start_date: string;
  end_date?: string;
  duration: number;
  notice_period?: number;
  approval_type: ApprovalType;
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
