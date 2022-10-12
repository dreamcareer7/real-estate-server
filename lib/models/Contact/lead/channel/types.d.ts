export type LeadSourceType = 'Zillow' | 'Realtor'

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

export interface Zillow {
  Source: string
  ContactMessage: {
    ContactInfo: {
      PartnerAgentIdentifier: string
      ZillowAgentID: string
      ZillowAgentProfileURL: string
      ClientGUID: string
      ContactName: string
      ContactPhone: string
      ContactEmail: string
      ContactMessage: string
      ContactDateTime: string
      ContactUrl: string
      ZillowAgentWebsiteURL: string
      Brokerage: string
      CommunicationGUID: string
      Update: boolean
      ContactType: string
      LeadDateTime: string
      Reassignment: boolean
      IsConnected: boolean
      Assignee: {
        ZillowAssigneeAgentID: string
        ZillowAssigneeAgentProfileURL: string
        ZillowAssigneeAgentWebsiteURL: string
        ReassignmentDateTime: string
        ZillowAssigneeAgentPhone: string
        ZillowAssigneeAgentEmail: string
        ZillowAssigneeAgentName: string
        ZillowAssigneePartnerAgentIdentifier: string
      }
    }
    SearchCriteria: {
      City: string
      State: string
      ZIP: string
      MinBeds: string
      MinBaths: string
      MinPrice: string
      MaxPrice: string
      MinSqFt: string
      MaxSqFt: string
      MinLotSize: string
      MaxLotSize: string
      MinYearBuilt: string
      MaxYearBuilt: string
      PropertyTypes: string
    }
    PropertyInfo: {
      ZillowPropertyURL: string
      MLSNumber: string
      StreetAddress: string
      City: string
      State: string
      Zip: string
      Beds: string
      Baths: string
      ListingPrice: string
      ListingStatus: string
      PhotoURL: string
    }
  }
}

export interface Zillow_Sns{
  Message: string
  Type: string
  MessageId: string
  TopicArn: string
  Timestamp: string
  SignatureVersion: string
  Signature: string
  SigningCertURL: string
  UnsubscribeURL: string
}

export interface Realtor {
  Lead: {
    lead_info: {
      inquiry_guid: string
      lead_guid: string
      paid_type: string
      partner_customer_id: string
      communication_guid: string
      lead_source: string
      lead_sub_source: string
      lead_sub_source_version: string
      lead_type: string
      lead_method: string
      lead_date_time: string //ISO DATE
      test: Boolean
      rdc_customer_info: {
        recipient_customer_email: string
        billing_customer_id: number
        billing_customer_type: string
        recipient_customer_id: number
        recipient_customer_name: string
        recipient_customer_type: string
      }
      lead_consumer_info: {
        full_name: string
        first_name: string
        last_name: string
        email: string
        email_verification_status: string
        phone: string
        phone_verification_status: string
        message: string
        role: string
        finance_info: Boolean
        credit_score: string
        is_veteran: string | null
        jornaya_tcpa_id: string
        is_likely_to_transact: Boolean
        probability_to_transact: number
        rdc_omniture_visitor_id: string
        rdc_member_id: string
        rdc_visitor_id: string
        rdc_lender_type: string
        move_in_date: string
        timeframe: string
      }
      lead_property_info: {
        mls_abbreviation: string
        mls_id: string
        mls_name: string
        price_type: string
        property_status: string
        rdc_property_url: string
        property_price: number
        property_type: string
        property_street_address: string
        property_city: string
        property_state_code: string
        property_zip: string
        property_latitude: number
        property_longitude: number
        property_beds: number
        property_baths: number
        listing_status: string
        listing_date: string
        days_on_market: number
        cashback_enabled: Boolean
        smarthome_enabled: Boolean
        rdc_property_id: string
        rdc_listing_id: string
        rdc_new_homes_community_id: string
        source_new_homes_community_id: string
        rdc_new_homes_plan_id: string
        source_new_homes_plan_id: string
        rdc_new_homes_moveInReady_id: string
        source_new_homes_moveInReady_id: string
        community_name: string
        plan_name: string
        property_min_beds: number
        property_max_beds: number
        property_min_baths: number
        property_max_baths: number
        property_min_sqft: string
        property_max_sqft: string
        property_min_price: number
        property_max_price: number
      }
      listing_customer_info: {
        listing_broker_name: string
        listing_office_mls_id: string
        listing_office_mls_name: string
        listing_office_mls_abbreviation: string
        listing_office_name: string
        listing_office_email: string
        listing_office_phone: string
        listing_agent_mls_id: string
        listing_agent_mls_name: string
        listing_agent_mls_abbreviation: string
        listing_agent_name: string
        listing_agent_email: string
        listing_agent_phone: string
        community_street_address: string
        community_city: string
        community_state_code: string
        community_zip: string
        sale_office_phone: string
        corporation_id: string
        builder_name: string
        builder_id: string
        source_builder_id: string
      }
      lead_property_preferences_info: {
        recent_searches: {
          search_last_ran: string
          search_first_ran: string
          properties_viewed: number
          property_status: string
          city: string
          state_code: string
          postal_code: string
          beds_min: number
          beds_max: number
          baths_min: number
          baths_max: number
          price_min: number
          price_max: number
          sort_order: string
          property_type: string
        }[]
        recent_views: {
          first_viewed: string
          last_viewed: string
          property_status: string
          rdc_property_url: string
          mls_id: string
          mls_name: string
          mls_abbreviation: string
          price_type: string
          property_price: number
          property_type: string
          property_street_address: string
          property_city: string
          property_state_code: string
          property_zip: string
          property_latitude: number
          property_longitude: number
          property_beds: number
          property_baths: number
          listing_status: string
          listing_date: string
          days_on_market: number
          property_views: number
        }[]
        saved_searches: {
          saved_update_date: string
          saved_create_date: string
          property_status: string
          city: string
          state_code: string
          postal_code: string
          beds_min: number
          beds_max: number
          baths_min: number
          baths_max: number
          price_min: number
          price_max: number
  
        }[]
        saved_views: {
          first_viewed: string
          last_viewed: string
          property_status: string
          mls_id: string
          mls_name: string
          mls_abbreviation: string
        }[]
      }
      lead_form_info: {
        form_name: string
        form_variant: string
        page_name: string
        referral: string
        audience: string
        external_lead_id: string
        tour_type: string
      }
    }
   
  }
}