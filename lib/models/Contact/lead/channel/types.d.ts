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