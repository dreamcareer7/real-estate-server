
export type LeadSourceType =
  | 'Zillow'
  | 'Realtor'
  ;

export interface LeadChannelInput {
  sourceType: LeadSourceType
}

export interface LeadChannel {
  id: UUID
  brand: UUID
  user: UUID
  source_type: LeadSourceType
  created_at?: number
  updated_at?: number
  deleted_at?: number
  capture_number?: number
  last_capture_date?: number
}

export interface Filter {
  user?: UUID
  start?: number
  limit?: number
  source_type: LeadSourceType
}

export interface FilterResult {
  ids: UUID[]
  total: number
}
