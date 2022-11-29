declare type TPropertyType =
  | 'Residential'
  | 'Residential Lease'
  | 'Multi-Family'
  | 'Commercial'
  | 'Lots & Acreage'
  | 'Unknown'


declare type TPropertySubtype =
  | 'MUL-Apartment/5Plex+'
  | 'MUL-Fourplex'
  | 'MUL-Full Duplex'
  | 'MUL-Multiple Single Units'
  | 'MUL-Triplex'
  | 'LSE-Apartment'
  | 'LSE-Condo/Townhome'
  | 'LSE-Duplex'
  | 'LSE-Fourplex'
  | 'LSE-House'
  | 'LSE-Mobile'
  | 'LSE-Triplex'
  | 'LND-Commercial'
  | 'LND-Farm/Ranch'
  | 'LND-Residential'
  | 'RES-Condo'
  | 'RES-Farm/Ranch'
  | 'RES-Half Duplex'
  | 'RES-Single Family'
  | 'RES-Townhouse'
  | 'COM-Lease'
  | 'COM-Sale'
  | 'COM-Sale or Lease (Either)'
  | 'COM-Sale/Leaseback (Both)'
  | 'Unknown'
  | 'Lot/Land'

declare type TListingStatus =
  | 'Active'
  | 'Sold'
  | 'Pending'
  | 'Temp Off Market'
  | 'Leased'
  | 'Active Option Contract'
  | 'Active Contingent'
  | 'Active Kick Out'
  | 'Withdrawn'
  | 'Expired'
  | 'Cancelled'
  | 'Withdrawn Sublisting'
  | 'Incomplete'
  | 'Unknown'
  | 'Out Of Sync'
  | 'Incoming'
  | 'Coming Soon'

declare type Mls =
  | 'NTREIS'
  | 'HAR'
  | 'CRMLS'
  | 'ABOR'
  | 'LAAR'
  | 'GTAR'
  | 'BRIGHT'
  | 'OKCMAR'
  | 'NEREN'
  | 'TBOR'
  | 'NEFAR'
  | 'DASH'
  | 'NWMR'
  | 'MAAR'
  | 'ONEKEY'
  | 'RAPB'
  | 'SMART'
  | 'EELI'

declare interface IListing extends IModel {
  property: IProperty;

  price: number
  status: TListingStatus
  mls: Mls
  matrix_unique_id: string
  matrix_modified_dt: string

  is_address_public?: boolean
  original_price?: number
  last_price?: number
  association_fee?: number
  association_fee_frequency?: string
  association_fee_includes?: string
  mls_number?: string
  unexempt_taxes?: number
  financing_proposed?: string
  list_office_mui?: string
  list_office_mls_id?: string
  list_office_name?: string
  list_office_phone?: string
  co_list_office_mui?: string
  co_list_office_mls_id?: string
  co_list_office_name?: string
  co_list_office_phone?: string
  selling_office_mui?: string
  selling_office_mls_id?: string
  selling_office_name?: string
  selling_office_phone?: string
  co_selling_office_mui?: string
  co_selling_office_mls_id?: string
  co_selling_office_name?: string
  co_selling_office_phone?: string
  list_agent_mui?: string
  list_agent_direct_work_phone?: string
  list_agent_email?: string
  list_agent_full_name?: string
  list_agent_mls_id?: string
  co_list_agent_mui?: string
  co_list_agent_direct_work_phone?: string
  co_list_agent_email?: string
  co_list_agent_full_name?: string
  co_list_agent_mls_id?: string
  selling_agent_mui?: string
  selling_agent_direct_work_phone?: string
  selling_agent_email?: string
  selling_agent_full_name?: string
  selling_agent_mls_id?: string
  co_selling_agent_mui?: string
  co_selling_agent_direct_work_phone?: string
  co_selling_agent_email?: string
  co_selling_agent_full_name?: string
  co_selling_agent_mls_id?: string
  listing_agreement?: string
  possession?: string
  mls_area_major?: string
  mls_area_minor?: string
  mls_name?: string
  showing_instructions_type?: string
  tax_legal_description?: string
  keybox_type?: string
  keybox_number?: string
  close_date?: string
  close_price?: number
  dom?: number
  cdom?: number
  buyers_agency_commission?: string
  sub_agency_commission?: string
  list_date?: string
  showing_instructions?: string
  appointment_phone?: string
  appointment_phone_estring?: string
  appointment_call?: string
  occupancy?: string
  private_remarks?: string
  application_fee?: boolean
  original_mls_property_type?: string
  original_mls_property_subtype?: string
  original_mls_status?: string
  transaction_type?: string
  usage_type?: string
  structure_type?: string

  co_list_agent2_mui?: string
  co_list_agent2_direct_work_phone?: string
  co_list_agent2_email?: string
  co_list_agent2_full_name?: string
  co_list_agent2_mls_id?: string
  co_list_agent3_mui?: string
  co_list_agent3_direct_work_phone?: string
  co_list_agent3_email?: string
  co_list_agent3_full_name?: string
  co_list_agent3_mls_id?: string
  co_selling_agent2_mui?: string
  co_selling_agent2_direct_work_phone?: string
  co_selling_agent2_email?: string
  co_selling_agent2_full_name?: string
  co_selling_agent2_mls_id?: string
  co_selling_agent3_mui?: string
  co_selling_agent3_direct_work_phone?: string
  co_selling_agent3_email?: string
  co_selling_agent3_full_name?: string
  co_selling_agent3_mls_id?: string
}

declare interface IAddress {
  mls: Mls
  matrix_unique_id: string

  title?: string
  subtitle?: string
  street_number?: string
  street_name?: string
  city?: string
  state?: string
  state_code?: string
  postal_code?: string
  neighborhood?: string
  street_suffix?: string
  unit_number?: string
  country: string
  country_code: string
  county_or_parish?: string
  direction?: string
  street_dir_prefix?: string
  street_dir_suffix?: string
  street_number_searchable?: string

  full_address: string;
  street_address: string;

  geocode?: IGeocode[]
}

declare type IGeocode = {
  latitude: number;
  longitude: number;
  approximate: boolean;
  confidence: string;
  geo_source: 'Google' | 'Bing' | 'Mapbox';
  formatted_address: string;
  accurate_enough: boolean;
} | {
  geo_source: 'MLS';
  confidence?: string;
  approximate: boolean;
  latitude: number;
  longitude: number;
};

declare interface IProperty {
  address: IAddress

  mls: Mls
  matrix_unique_id: string

  bedroom_count?: number
  bathroom_count?: number
  description: string
  square_meters?: number
  property_type?: TPropertyType
  property_subtype?: TPropertySubtype
  lot_square_meters?: number
  year_built?: number
  exterior_features?: string
  interior_features?: string
  fireplace_features?: string
  lot_features?: string
  parking_features?: string
  pool_features?: string
  security_features?: string
  parking_spaces_covered_total?: number
  half_bathroom_count?: number
  full_bathroom_count?: number
  heating?: string
  flooring?: string
  utilities?: string
  utilities_other?: string
  architectural_style?: string
  number_of_stories?: number
  number_of_parking_spaces?: number
  garage_length?: number
  garage_width?: number
  number_of_dining_areas?: number
  number_of_living_areas?: number
  fireplaces_total?: number
  lot_number?: string
  soil_type?: string
  construction_materials?: string
  foundation_details?: string
  roof?: string
  pool_yn?: boolean
  handicap_yn?: boolean
  elementary_school_name?: string
  intermediate_school_name?: string
  high_school_name?: string
  junior_high_school_name?: string
  middle_school_name?: string
  primary_school_name?: string
  senior_high_school_name?: string
  school_district?: string
  subdivision_name?: string
  appliances_yn?: boolean
  green_building_certification?: string
  green_energy_efficient?: string
  lot_size?: number
  lot_size_area?: number
  lot_size_dimensions?: string
  number_of_pets_allowed?: number
  number_of_units?: number
  pets_yn?: boolean
  furnished_yn?: boolean
  fenced_yard_yn?: boolean
  block?: string
  pets_policy?: string
  amenities?: string[]
}
