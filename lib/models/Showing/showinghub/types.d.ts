export type AppointmentType =
  | 'FirstShowing'
  | 'SecondShowing'
  | 'ThirdShowing'
  | 'AgentPreview'
  | 'Appraisal'
  | 'BrokerPriceOpinion'
  | 'Inspection'
  | 'Maintenance'
  ;

export type AppointmentMethod =
  | 'InPersonOnly'
  | 'VirtualOnly'
  | 'InPersonAndVirtual'
  ;

export type AppointmentStatus =
  | 'Confirmed'
  | 'Cancelled'
  | 'Requested'
  | 'Denied'
  ;

export type WebhookEvent =
  | 'ApplicationChanged'
  | 'AppointmentConfirmed'
  | 'ApplicationCreated'
  | 'AppointmentRequested'
  | 'ShowListingChanged'
  | 'ShowListingCreated'
// TODO: To be continued?
  ;

/**
 * The appointment request.
 */
export interface AppointmentRequest {
  /**
   * The request's start date.
   * @format date-time
   */
  startDatetime: string;

  /**
   * The request's end date.
   * @format date-time
   */
  endDatetime: string;

  /** Defines the AppointmentType. */
  appointmentType: AppointmentType;

  /** Defines the AppointmentMethod. */
  appointmentMethod: AppointmentMethod;

  /** The buying agent's unique identifier. */
  buyingAgentID: string;

  /** The buying agent's name. */
  buyingAgentName: string;

  /** The buying agent's affirmation that he/she is licenses. */
  buyingAgentStateLicenseAffirmation?: boolean;

  /** Buying agent's license number. */
  buyingAgentLicenseNumber: string;

  /** The buying agent's state where the license was issued. */
  buyingAgentLicenseState: string;

  /** The buying agent's MLSID */
  buyingAgentMlsId: string;

  /** The appointment notes. */
  appointmentNotes?: string | null;

  /**
   * Gets or sets the RequestId.
   * @format uuid
   */
  requestId: string;
}

/**
 * The appointment response.
 */
export interface AppointmentResponse {
  /**
   * The unique identifier for the request.
   * @format uuid
   */
  requestId?: string;

  /**
   * The unique identifier for the appointment.
   * @format uuid
   */
  appointmentId?: string;

  /**
   * The request's start date.
   * @format date-time
   */
  actualStartDatetime?: string;

  /**
   * The request's end date.
   * @format date-time
   */
  actualEndDatetime?: string;

  /** The type of appointment being requested. */
  appointmentType?: string | null;

  /** The appointment method. */
  appointmentMethod?: string | null;

  /** The buying agent's unique identifier. */
  buyingAgentID?: string | null;

  /** The buying agent's name. */
  buyingAgentName?: string | null;

  /** The buying agent's affirmation that he/she is licenses. */
  buyingAgentStateLicenseAffirmation?: boolean;

  /** Buying agent's license number. */
  buyingAgentLicenseNumber?: string | null;

  /** The buying agent's state where the license was issued. */
  buyingAgentLicenseState?: string | null;

  /** The buying agent's MLSID */
  buyingAgentMlsId?: string | null;

  /** The status of the request. */
  appointmentStatus?: string | null;
  createdBy?: string | null;
  modifiedBy?: string | null;
  createdOn?: string | null;
  modifiedOn?: string | null;
}

export interface AppointmentResult {
  isSuccessful?: boolean;
  results?: AppointmentResponse[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

/**
 * Defines the CancellationReasonType.
 */
export type CancellationReasonType =
  | 'Reschedule'
  | 'PropertyOffMarket'
  | 'SchedulingConflict'
  | 'Other'
  ;

/**
 * The cancellation request.
 */
export interface CancellationRequest {
  /** Defines the CancellationReasonType. */
  cancelReason?: CancellationReasonType;
  cancelComments?: string | null;
}

/**
 * The request to deny an appointment.
 */
export interface DenyRequest {
  /** The reason for denying the appointment, if any. */
  appointmentNotes?: string | null;
}

export interface AppointmentUpdateRequest {
  /**
   * The request's start date.
   * @format date-time
   */
  actualStartDatetime: string;

  /**
   * The request's end date.
   * @format date-time
   */
  actualEndDatetime: string;

  /** Defines the AppointmentType. */
  appointmentType: AppointmentType;

  /** Defines the AppointmentMethod. */
  appointmentMethod: AppointmentMethod;

  /** The buying agent's unique identifier. */
  buyingAgentID: string;

  /** The buying agent's name. */
  buyingAgentName: string;

  /** The buying agent's affirmation that he/she is licenses. */
  buyingAgentStateLicenseAffirmation?: boolean;

  /** Buying agent's license number. */
  buyingAgentLicenseNumber: string;

  /** The buying agent's state where the license was issued. */
  buyingAgentLicenseState: string;

  /** The buying agent's MLSID */
  buyingAgentMlsId: string;

  /** The appointment notes. */
  appointmentNotes?: string | null;
}

export type QueryParameterOperation =
  | 'Equal'
  | 'GreaterThan'
  | 'GreaterThanOrEqual'
  | 'LessThan'
  | 'LessThanOrEqual'
  | 'Between'
  | 'NotEqual'
  | 'NotEmpty'
  | 'Like'
  | 'HasAny'
  | 'Contains'
  | 'StartsWith'
  | 'NotLike'
  | 'ContainsAny'
  ;

export interface ApiQueryParameter {
  field?: string | null;
  op?: QueryParameterOperation;
  values?: string[] | null;
}

export type QuerySortDirection = 'Asc' | 'Desc';

export interface ApiSortParameter {
  field?: string | null;
  direction?: QuerySortDirection;
}

export interface ApiQuery {
  /** @format int32 */
  pageId?: number;

  /** @format int32 */
  pageSize?: number;
  criteria?: ApiQueryParameter[] | null;
  orderBy?: ApiSortParameter[] | null;
  fields?: string[] | null;
}

/**
 * Restriction
 * Standard Entity implementation of Restriction
 */
export interface RestrictionEntity {
  /**
   * Restrictions start date/time True
   * @format date-time
   */
  startDatetime: string;

  /**
   * Restriction end date/time. True
   * @format date-time
   */
  endDatetime: string;

  /**
   * The showable listing's unique identifier. True
   * @format uuid
   */
  showListingId: string;

  /** Defines the Reference.ShowingManager.Hub.Core.Models.Hub.ShowListingEntity. */
  showListing?: ShowListingEntity;
  createdBy?: string | null;

  /** @format date-time */
  createdOn?: string;

  /** @format int32 */
  id?: number;
  modifiedBy?: string | null;

  /** @format date-time */
  modifiedOn?: string;
}

/**
* ReoccurringRestriction
Standard Entity implementation of ReoccurringRestriction
*/
export interface ReoccurringRestrictionEntity {
  /**
   * Restrictions start date/time True
   * @format date-time
   */
  startDatetime: string;

  /**
   * Restriction end date/time. True
   * @format date-time
   */
  endDatetime: string;

  /**
   * The showable listing's unique identifier. True
   * @format uuid
   */
  showListingId: string;

  /** Defines the Reference.ShowingManager.Hub.Core.Models.Hub.ShowListingEntity. */
  showListing?: ShowListingEntity;

  /**
   * The day of the week. True
   * @format int32
   */
  dayOfWeek: number;

  /**
   * The date/time the restriction is to take place. True
   * @format date-time
   */
  beginDate: string;

  /**
   * The number of weeks. True
   * @format int32
   */
  numberOfWeeks: number;
  createdBy?: string | null;

  /** @format date-time */
  createdOn?: string;

  /** @format int32 */
  id?: number;
  modifiedBy?: string | null;

  /** @format date-time */
  modifiedOn?: string;
}

/**
* Organization
Standard Entity implementation of Organization
*/
export interface OrganizationEntity {
  /** The organization name. True */
  organizationName: string;

  /** The contact email True */
  contactEmail: string;

  /** The contact's first name. True */
  contactFirstName: string;

  /** The contact's last name. True */
  contactLastName: string;

  /** The contact's phone number. True */
  contactPhone: string;

  /** The organization's status True */
  organizationStatus: string;

  /** The organization type. True */
  organizationType: string;

  /**
   * The date/time the email was verified. False
   * @format date-time
   */
  emailVerifiedOn?: string | null;

  /** Email verified flag. True */
  emailVerified: boolean;
  createdBy?: string | null;

  /** @format date-time */
  createdOn?: string;

  /** @format uuid */
  id?: string;
  modifiedBy?: string | null;

  /** @format date-time */
  modifiedOn?: string;
}

/**
 * Defines the Reference.ShowingManager.Hub.Core.Models.Hub.ApplicationEntity.
 */
export interface ApplicationEntity {
  /** API Key. This key is unique and will be issued once the Application has been confirmed. */
  apiKey: string;

  /** Gets or sets the property show listings. */
  showListings?: ShowListingEntity[] | null;

  /** The application name. True */
  applicationName: string;

  /** The contact email True */
  contactEmail: string;

  /** The contact's first name. True */
  contactFirstName: string;

  /** The contact's last name. True */
  contactLastName: string;

  /** The contact's phone number. True */
  contactPhone: string;

  /** The callback url. False */
  callBackUrl?: string | null;

  /** The application scope. True */
  applicationScope: string;

  /**
   * Organization foreign key identifier. True
   * @format uuid
   */
  organizationId: string;

  /**
   * Organization
   * Standard Entity implementation of Organization
   */
  organization?: OrganizationEntity;
  createdBy?: string | null;

  /** @format date-time */
  createdOn?: string;

  /** @format uuid */
  id?: string;
  modifiedBy?: string | null;

  /** @format date-time */
  modifiedOn?: string;
}

/**
 * Defines the Reference.ShowingManager.Hub.Core.Models.Hub.ShowListingEntity.
 */
export interface ShowListingEntity {
  restrictions?: RestrictionEntity[] | null;
  reoccurringRestrictionsList?: ReoccurringRestrictionEntity[] | null;

  /** Universal Property Identifier False */
  upi?: string | null;

  /** The property address. True */
  address1: string;

  /** The apt/suite. False */
  address2?: string | null;

  /** The property's city. True */
  city: string;

  /** The property's state. True */
  state: string;

  /** The property's postal code. True */
  zipCode: string;

  /** The listing agent's MLS identifier. True */
  listAgentMlsId: string;

  /** The listing agent's name. True */
  listAgentName: string;

  /** The listing agents affirmation that he/she is licensed in the state. True */
  listAgentLicenseStateAffirmation: boolean;

  /** The listing agent's license number. True */
  listAgentLicenseNumber: string;

  /** The state that issued the license for the listing agent. True */
  listingAgentLicenseState: string;

  /**
   * The date the showing can start. True
   * @format date-time
   */
  showableStartDate: string;

  /**
   * The date the property showing will end. True
   * @format date-time
   */
  showableEndDate: string;

  /** The showing instructions. False */
  showingInstructions?: string | null;

  /** Any comments for the property showing. False */
  comments?: string | null;

  /** The required participants. True */
  requiredParticipants: string;

  /** The method the property will be shown. True */
  showingMethod: string;

  /** The confirmation type. True */
  confirmationType: string;

  /** Is the property allowed to be shown. True */
  showingsAllowed: string;

  /** The listing identifier from source. True */
  listingId: string;

  /**
   * Gets or sets the foreign key to the Application. True
   * @format uuid
   */
  applicationId: string;

  /** Defines the Reference.ShowingManager.Hub.Core.Models.Hub.ApplicationEntity. */
  application?: ApplicationEntity;
  createdBy?: string | null;

  /** @format date-time */
  createdOn?: string;

  /** @format uuid */
  id?: string;
  modifiedBy?: string | null;

  /** @format date-time */
  modifiedOn?: string;
}

/**
 * Defines the Reference.ShowingManager.Hub.Core.Models.Hub.RequestEntity.
 */
export interface RequestEntity {
  appointments?: AppointmentEntity[] | null;

  /**
   * The request's start date. True
   * @format date-time
   */
  startDatetime: string;

  /**
   * The request's end date. True
   * @format date-time
   */
  endDatetime: string;

  /** The type of appointment being requested. True */
  appointmentType: string;

  /** The appointment method. True */
  appointmentMethod: string;

  /** The buying agent's unique identifier. True */
  buyingAgentID: string;

  /** The buying agent's name. True */
  buyingAgentName: string;

  /** The buying agent's affirmation that he/she is licenses. True */
  buyingAgentStateLicenseAffirmation: boolean;

  /** Buying agent's license number. True */
  buyingAgentLicenseNumber: string;

  /** The buying agent's state where the license was issued. True */
  buyingAgentLicenseState: string;

  /** The buying agent's MLSID True */
  buyingAgentMlsId: string;

  /** The request notes. False */
  requestNotes?: string | null;

  /** The status of the request. True */
  requestStatus: string;

  /**
   * Gets or sets the ShowListingId. True
   * @format uuid
   */
  showListingId: string;

  /** Defines the Reference.ShowingManager.Hub.Core.Models.Hub.ShowListingEntity. */
  showListing?: ShowListingEntity;
  createdBy?: string | null;

  /** @format date-time */
  createdOn?: string;

  /** @format uuid */
  id?: string;
  modifiedBy?: string | null;

  /** @format date-time */
  modifiedOn?: string;
}

/**
 * Defines the Reference.ShowingManager.Hub.Core.Models.Hub.AppointmentEntity.
 */
export interface AppointmentEntity {
  /**
   * The appointment's actual start time. True
   * @format date-time
   */
  actualStartDatetime: string;

  /**
   * The appointment's actual end time. True
   * @format date-time
   */
  actualEndDatetime: string;

  /** The type of appointment. True */
  appointmentType: string;

  /** The appointment method. True */
  appointmentMethod: string;

  /** The buying agent's identifier. True */
  buyingAgentID: string;

  /** The buying agent's name. True */
  buyingAgentName: string;

  /** The buying agent's affirmation that he/she is licensed. True */
  buyingAgentStateLicenseAffirmation: boolean;

  /** The buying agent's license number. True */
  buyingAgentLicenseNumber: string;

  /** The buying agent's state where the license was issued. True */
  buyingAgentLicenseState: string;

  /** The buying agent's MLSID. True */
  buyingAgentMlsId: string;

  /** The notes on the appointment, coming from the request. False */
  appointmentNotes?: string | null;

  /** The status of the appointment. False */
  appointmentStatus?: string | null;

  /** The reason the appointment was canceled. False */
  cancelReason?: string | null;

  /** The comments for the cancellation. False */
  cancelComments?: string | null;

  /**
   * The foreign key for Reference.ShowingManager.Hub.Core.Models.Hub.AppointmentEntity.Request True
   * @format uuid
   */
  requestId: string;

  /** Defines the Reference.ShowingManager.Hub.Core.Models.Hub.RequestEntity. */
  request?: RequestEntity;
  createdBy?: string | null;

  /** @format date-time */
  createdOn?: string;

  /** @format uuid */
  id?: string;
  modifiedBy?: string | null;

  /** @format date-time */
  modifiedOn?: string;
}

export interface AppointmentQueryResult {
  /** @format int32 */
  pageId?: number;

  /** @format int32 */
  pageSize?: number;

  /** @format int32 */
  totalResults?: number;

  /** @format int32 */
  totalPages?: number;
  isSuccessful?: boolean;
  results?: AppointmentEntity[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

/**
 * Defines the OrganizationType.
 */
export type OrganizationType = 'ShowingManager' | 'MLS' | 'Brokerage' | 'Syndicator';

export interface OrganizationRegistrationRequest {
  /** The organization name. */
  organizationName?: string | null;

  /** The contact email */
  contactEmail?: string | null;

  /** The contact's first name. */
  contactFirstName?: string | null;

  /** The contact's last name. */
  contactLastName?: string | null;

  /** The contact's phone number. */
  contactPhone?: string | null;

  /** Defines the OrganizationType. */
  organizationType?: OrganizationType;
}

/**
 * Defines the Reference.ShowingManager.Hub.Core.Services.Responses.OrganizationRegistrationResponse.
 */
export interface OrganizationRegistrationResponse {
  /** Gets or sets the OrganizationId. */
  organizationId?: string | null;

  /** Gets or sets the OrganizationStatus. */
  organizationStatus?: string | null;

  /** Gets or sets the OrganizationName. */
  organizationName?: string | null;

  /** Gets or sets the OrganizationContact. */
  organizationContact?: string | null;

  /** Gets or sets the CreatedBy. */
  createdBy?: string | null;

  /** Gets or sets the ModifiedBy. */
  modifiedBy?: string | null;

  /** Gets or sets the CreatedOn. */
  createdOn?: string | null;

  /** Gets or sets the ModifiedOn. */
  modifiedOn?: string | null;
}

/**
 * Defines the Reference.ShowingManager.Hub.Core.Services.Responses.OrganizationRegistrationResult.
 */
export interface OrganizationRegistrationResult {
  isSuccessful?: boolean;
  results?: OrganizationRegistrationResponse[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

export interface OrganizationUpdateRequest {
  /**
   * Gets or sets the OrganizationName
   * The organization name..
   */
  organizationName?: string | null;

  /**
   * Gets or sets the ContactEmail
   * The contact email.
   */
  contactEmail?: string | null;

  /**
   * Gets or sets the ContactFirstName
   * The contact's first name..
   */
  contactFirstName?: string | null;

  /**
   * Gets or sets the ContactLastName
   * The contact's last name..
   */
  contactLastName?: string | null;

  /**
   * Gets or sets the ContactPhone
   * The contact's phone number..
   */
  contactPhone?: string | null;

  /** Defines the OrganizationType. */
  organizationType?: OrganizationType;
}

/**
 * The new request.
 */
export interface NewRequest {
  /**
   * The request's start date.
   * @format date-time
   */
  startDatetime: string;

  /**
   * The request's end date.
   * @format date-time
   */
  endDatetime: string;

  /** Defines the AppointmentType. */
  appointmentType: AppointmentType;

  /** Defines the AppointmentMethod. */
  appointmentMethod: AppointmentMethod;

  /** The buying agent's unique identifier. */
  buyingAgentID: string;

  /** The buying agent's name. */
  buyingAgentName: string;

  /** The buying agent's affirmation that he/she is licenses. */
  buyingAgentStateLicenseAffirmation?: boolean;

  /** Buying agent's license number. */
  buyingAgentLicenseNumber: string;

  /** The buying agent's state where the license was issued. */
  buyingAgentLicenseState: string;

  /** The buying agent's MLSID */
  buyingAgentMlsId: string;

  /** The request notes. */
  requestNotes?: string | null;

  /**
   * Gets or sets the ShowListingId.
   * @format uuid
   */
  showListingId: string;
}

export interface RequestResponse {
  /**
   * The request identifier.
   * @format uuid
   */
  requestId?: string;

  /**
   * The unique identifier for the appointment.
   * @format uuid
   */
  appointmentId?: string;
  createdBy?: string | null;
  modifiedBy?: string | null;
  createdOn?: string | null;
  modifiedOn?: string | null;

  /**
   * The request's start date.
   * @format date-time
   */
  startDatetime?: string;

  /**
   * The request's end date.
   * @format date-time
   */
  endDatetime?: string;

  /** The type of appointment being requested. */
  appointmentType?: string | null;

  /** The appointment method. */
  appointmentMethod?: string | null;

  /** The buying agent's unique identifier. */
  buyingAgentID?: string | null;

  /** The buying agent's name. */
  buyingAgentName?: string | null;

  /** The buying agent's affirmation that he/she is licenses. */
  buyingAgentStateLicenseAffirmation?: boolean;

  /** Buying agent's license number. */
  buyingAgentLicenseNumber?: string | null;

  /** The buying agent's state where the license was issued. */
  buyingAgentLicenseState?: string | null;

  /** The buying agent's MLSID */
  buyingAgentMlsId?: string | null;

  /** The request notes. */
  requestNotes?: string | null;

  /** The status of the request. */
  requestStatus?: string | null;

  /**
   * Gets or sets the ShowListingId.
   * @format uuid
   */
  showListingId?: string;
}

export interface RequestResult {
  isSuccessful?: boolean;
  results?: RequestResponse[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

/**
 * The update request.
 */
export interface UpdateRequest {
  /**
   * The request's start date.
   * @format date-time
   */
  startDatetime: string;

  /**
   * The request's end date.
   * @format date-time
   */
  endDatetime: string;

  /** Defines the AppointmentType. */
  appointmentType: AppointmentType;

  /** Defines the AppointmentMethod. */
  appointmentMethod: AppointmentMethod;

  /** The buying agent's unique identifier. */
  buyingAgentID: string;

  /** The buying agent's name. */
  buyingAgentName: string;

  /** The buying agent's affirmation that he/she is licenses. */
  buyingAgentStateLicenseAffirmation?: boolean;

  /** Buying agent's license number. */
  buyingAgentLicenseNumber: string;

  /** The buying agent's state where the license was issued. */
  buyingAgentLicenseState: string;

  /** The buying agent's MLSID */
  buyingAgentMlsId: string;

  /** The request notes. */
  requestNotes?: string | null;
}

export interface RequestQueryResult {
  /** @format int32 */
  pageId?: number;

  /** @format int32 */
  pageSize?: number;

  /** @format int32 */
  totalResults?: number;

  /** @format int32 */
  totalPages?: number;
  isSuccessful?: boolean;
  results?: RequestEntity[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

export interface ShowListingQueryResponse {
  /** @format uuid */
  showListingId?: string | null;

  /** @format uuid */
  applicationId?: string | null;

  /** Universal Property Identifier */
  upi?: string | null;

  /** The property address. */
  address1?: string | null;

  /** The apt/suite. */
  address2?: string | null;

  /** The property's city. */
  city?: string | null;

  /** The property's state. */
  state?: string | null;

  /** The property's postal code. */
  zipCode?: string | null;

  /** The listing agent's MLS identifier. */
  listAgentMlsId?: string | null;

  /** The listing agent's name. */
  listAgentName?: string | null;

  /** The listing agents affirmation that he/she is licensed in the state. */
  listAgentLicenseStateAffirmation?: boolean | null;

  /** The listing agent's license number. */
  listAgentLicenseNumber?: string | null;

  /** The state that issued the license for the listing agent. */
  listingAgentLicenseState?: string | null;

  /**
   * The date the showing can start.
   * @format date-time
   */
  showableStartDate?: string | null;

  /**
   * The date the property showing will end.
   * @format date-time
   */
  showableEndDate?: string | null;

  /** The showing instructions. */
  showingInstructions?: string | null;

  /** Any comments for the property showing. */
  comments?: string | null;

  /** The required participants. */
  requiredParticipants?: string | null;

  /** The method the property will be shown. */
  showingMethod?: string | null;

  /** The confirmation type. */
  confirmationType?: string | null;

  /** Is the property allowed to be shown. */
  showingsAllowed?: string | null;

  /** The listing identifier from source. */
  listingId?: string | null;
  createdBy?: string | null;
  modifiedBy?: string | null;
  createdOn?: string | null;
  modifiedOn?: string | null;
}

export interface ShowableListingQueryResult {
  /** @format int32 */
  pageId?: number;

  /** @format int32 */
  pageSize?: number;

  /** @format int32 */
  totalResults?: number;

  /** @format int32 */
  totalPages?: number;
  isSuccessful?: boolean;
  results?: ShowListingQueryResponse[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

/**
 * Defines the RequiredParticipants.
 */
export type RequiredParticipants =
  | "ListingAgent"
  | "BuyingAgent"
  | "BothBuyingAndListingAgent"
  | "NoParticipants"
  ;

/**
 * Defines the ShowingMethod.
 */
export type ShowingMethod =
  | "InPersonOnly"
  | "VirtualOnly"
  | "InPersonAndVirtual"
  ;

/**
 * Defines the ConfirmationType.
 */
export type ConfirmationType =
  | "AutoApprove"
  | "ConfirmationRequired"
  | "ShowingInstructionsOnly"
  ;

/**
 * Defines the ShowingStatus.
 */
export type ShowingStatus =
  | "Showable"
  | "NotShowable"
  | "Suspended"
  ;

/**
 * Defines the Reference.ShowingManager.Hub.Core.Models.Hub.DateTimeRestrictions.
 */
export interface DateTimeRestrictions {
  /**
   * The restriction identifier.
   * @format int32
   */
  restrictionId?: number | null;

  /**
   * Gets or sets the StartDatetime.
   * @format date-time
   */
  startDatetime?: string;

  /**
   * Gets or sets the EndDatetime.
   * @format date-time
   */
  endDatetime?: string;
}

export type DayOfWeek =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  ;

/**
 * Defines the Reference.ShowingManager.Hub.Core.Models.Hub.DateTimeReoccurringRestrictions.
 */
export interface DateTimeReoccurringRestrictions {
  /**
   * The reoccurring identifier.
   * @format int32
   */
  reoccurringId?: number | null;
  dayOfWeek?: DayOfWeek;

  /**
   * The number of weeks.
   * @format int32
   */
  numberOfWeeks?: number;

  /**
   * Gets or sets the BeginDate.
   * @format date-time
   */
  beginDate?: string;

  /**
   * Gets or sets the StartDatetime.
   * @format date-time
   */
  startDatetime?: string;

  /**
   * Gets or sets the EndDatetime.
   * @format date-time
   */
  endDatetime?: string;
}

/**
 * The Showable Listing Request.
 */
export interface ShowableListingRequest {
  /** The listing identifier from source. */
  listingId?: string | null;

  /**
   * The application identifier.
   * @format uuid
   */
  applicationId?: string;

  /** Universal Property Identifier */
  universalPropertyId?: string | null;

  /** The property address. */
  address1?: string | null;

  /** The apt/suite. */
  address2?: string | null;

  /** The property's city. */
  city?: string | null;

  /** The property's state. */
  state?: string | null;

  /** The property's postal code. */
  zipCode?: string | null;

  /** The listing agent's MLS identifier. */
  listAgentMlsId?: string | null;

  /** The listing agent's name. */
  listAgentName?: string | null;

  /** The listing agents affirmation that he/she is licensed in the state. */
  listAgentLicenseStateAffirmation?: boolean;

  /** The listing agent's license number. */
  listAgentLicenseNumber: string;

  /** The state that issued the license for the listing agent. */
  listingAgentLicenseState?: string | null;

  /**
   * The date the showing can start.
   * @format date-time
   */
  showableStartDate?: string;

  /**
   * The date the property showing will end.
   * @format date-time
   */
  showableEndDate?: string;

  /** The showing instructions. */
  showingInstructions?: string | null;

  /** Any comments for the property showing. */
  comments?: string | null;

  /** Defines the RequiredParticipants. */
  requiredParticipants?: RequiredParticipants;

  /** Defines the ShowingMethod. */
  showingMethod?: ShowingMethod;

  /** Defines the ConfirmationType. */
  confirmationType?: ConfirmationType;

  /** Defines the ShowingStatus. */
  showingAllowed?: ShowingStatus;

  /** The date/time restrictions list for the show listing. */
  dateTimeRestrictionsList?: DateTimeRestrictions[] | null;

  /** The date/time reoccurring restrictions list for the show listing. */
  dateTimeReoccurringRestrictionsList?: DateTimeReoccurringRestrictions[] | null;
}

/**
 * Defines the Reference.ShowingManager.Hub.Core.Services.Responses.ShowListingResponse.
 */
export interface ShowListingResponse {
  /**
   * Gets or sets the ShowListingId.
   * @format uuid
   */
  showListingId?: string;

  /**
   * Gets or sets the ApplicationId.
   * @format uuid
   */
  applicationId?: string;

  /** Gets or sets the ListingId. */
  listingId?: string | null;

  /** Gets or sets the CreatedBy. */
  createdBy?: string | null;

  /** Gets or sets the ModifiedBy. */
  modifiedBy?: string | null;

  /** Gets or sets the CreatedOn. */
  createdOn?: string | null;

  /** Gets or sets the ModifiedOn. */
  modifiedOn?: string | null;

  /** Universal Property Identifier */
  upi?: string | null;

  /** The property address. */
  address1?: string | null;

  /** The apt/suite. */
  address2?: string | null;

  /** The property's city. */
  city?: string | null;

  /** The property's state. */
  state?: string | null;

  /** The property's postal code. */
  zipCode?: string | null;

  /** The listing agent's MLS identifier. */
  listAgentMlsId?: string | null;

  /** The listing agent's name. */
  listAgentName?: string | null;

  /** The listing agents affirmation that he/she is licensed in the state. */
  listAgentLicenseStateAffirmation?: boolean;

  /** The listing agent's license number. */
  listAgentLicenseNumber?: string | null;

  /** The state that issued the license for the listing agent. */
  listingAgentLicenseState?: string | null;

  /**
   * The date the showing can start.
   * @format date-time
   */
  showableStartDate?: string;

  /**
   * The date the property showing will end.
   * @format date-time
   */
  showableEndDate?: string;

  /** The showing instructions. */
  showingInstructions?: string | null;

  /** Any comments for the property showing. */
  comments?: string | null;

  /** The required participants. */
  requiredParticipants?: string | null;

  /** The method the property will be shown. */
  showingMethod?: string | null;

  /** The confirmation type. */
  confirmationType?: string | null;

  /** Is the property allowed to be shown. */
  showingsAllowed?: string | null;

  /** The date/time restrictions list for the show listing. */
  dateTimeRestrictionsList?: DateTimeRestrictions[] | null;

  /** The date/time reoccurring restrictions list for the show listing. */
  dateTimeReoccurringRestrictionsList?: DateTimeReoccurringRestrictions[] | null;
}

/**
 * Defines the Reference.ShowingManager.Hub.Core.Services.Responses.ShowListingResult.
 */
export interface ShowListingResult {
  isSuccessful?: boolean;
  results?: ShowListingResponse[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

export interface ShowableListingUpdateRequest {
  /** The listing identifier from source. */
  listingId: string;

  /** Universal Property Identifier */
  universalPropertyId: string;

  /** The property address. */
  address1: string;

  /** The apt/suite. */
  address2?: string | null;

  /** The property's city. */
  city: string;

  /** The property's state. */
  state: string;

  /** The property's postal code. */
  zipCode: string;

  /** The listing agent's MLS identifier. */
  listAgentMlsId: string;

  /** The listing agent's name. */
  listAgentName: string;

  /** The listing agents affirmation that he/she is licensed in the state. */
  listAgentLicenseStateAffirmation?: boolean;

  /** The listing agent's license number. */
  listAgentLicenseNumber: string;

  /** The state that issued the license for the listing agent. */
  listingAgentLicenseState: string;

  /**
   * The date the showing can start.
   * @format date-time
   */
  showableStartDate?: string;

  /**
   * The date the property showing will end.
   * @format date-time
   */
  showableEndDate?: string;

  /** The showing instructions. */
  showingInstructions?: string | null;

  /** Any comments for the property showing. */
  comments?: string | null;

  /** Defines the RequiredParticipants. */
  requiredParticipants?: RequiredParticipants;

  /** Defines the ShowingMethod. */
  showingMethod?: ShowingMethod;

  /** Defines the ConfirmationType. */
  confirmationType?: ConfirmationType;

  /** Defines the ShowingStatus. */
  showingAllowed?: ShowingStatus;
}

export interface RestrictionQueryResult {
  /** @format int32 */
  pageId?: number;

  /** @format int32 */
  pageSize?: number;

  /** @format int32 */
  totalResults?: number;

  /** @format int32 */
  totalPages?: number;
  isSuccessful?: boolean;
  results?: RestrictionEntity[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

export interface RestrictionsResponse {
  listingId?: string | null;

  /**
   * The restriction identifier.
   * @format int32
   */
  restrictionId?: number | null;

  /**
   * Gets or sets the StartDatetime.
   * @format date-time
   */
  startDatetime?: string;

  /**
   * Gets or sets the EndDatetime.
   * @format date-time
   */
  endDatetime?: string;
}

export interface RestrictionsResult {
  isSuccessful?: boolean;
  results?: RestrictionsResponse[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

export interface ReoccurringRestrictionQueryResult {
  /** @format int32 */
  pageId?: number;

  /** @format int32 */
  pageSize?: number;

  /** @format int32 */
  totalResults?: number;

  /** @format int32 */
  totalPages?: number;
  isSuccessful?: boolean;
  results?: ReoccurringRestrictionEntity[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

export interface ReoccurringRestrictionListResponse {
  /** Gets or sets the ReoccurringRestrictionId. */
  reoccurringRestrictionId?: string | null;

  /**
   * Showing list identifier.
   * @format uuid
   */
  showingListId?: string;

  /**
   * The reoccurring identifier.
   * @format int32
   */
  reoccurringId?: number | null;
  dayOfWeek?: DayOfWeek;

  /**
   * The number of weeks.
   * @format int32
   */
  numberOfWeeks?: number;

  /**
   * Gets or sets the BeginDate.
   * @format date-time
   */
  beginDate?: string;

  /**
   * Gets or sets the StartDatetime.
   * @format date-time
   */
  startDatetime?: string;

  /**
   * Gets or sets the EndDatetime.
   * @format date-time
   */
  endDatetime?: string;
}

export interface ReoccurringRestrictionListResult {
  isSuccessful?: boolean;
  results?: ReoccurringRestrictionListResponse[][] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

/**
 * Defines the Reference.ShowingManager.Hub.Core.Services.Responses.ReoccurringRestrictionsResponse.
 */
export interface ReoccurringRestrictionsResponse {
  /** Gets or sets the ReoccurringRestrictionId. */
  reoccurringRestrictionId?: string | null;

  /**
   * Showing list identifier.
   * @format uuid
   */
  showingListId?: string;

  /**
   * The reoccurring identifier.
   * @format int32
   */
  reoccurringId?: number | null;
  dayOfWeek?: DayOfWeek;

  /**
   * The number of weeks.
   * @format int32
   */
  numberOfWeeks?: number;

  /**
   * Gets or sets the BeginDate.
   * @format date-time
   */
  beginDate?: string;

  /**
   * Gets or sets the StartDatetime.
   * @format date-time
   */
  startDatetime?: string;

  /**
   * Gets or sets the EndDatetime.
   * @format date-time
   */
  endDatetime?: string;
}

/**
 * Defines the Reference.ShowingManager.Hub.Core.Services.Responses.ReocurringRestrictionsResult.
 */
export interface ReocurringRestrictionsResult {
  isSuccessful?: boolean;
  results?: ReoccurringRestrictionsResponse[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

export interface AccessTokenResult {
  token?: string | null;
  expiration?: string | null;
  notBefore?: string | null;
}

export interface WebhookPayload<TPayload> {
  organizationId: UUID;
  applicationId: UUID;
  subscriptionId: UUID;
  webhookEvent: WebhookEvent;
  attempt: number;
  data: TPayload;
  creationTimeUtc: string;
}

export interface CommonApiResult {
  isSuccessful?: boolean;
  results?: any[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

export type WebhookPayloadDataProp =
  | 'actualEndDatetime'
  | 'actualStartDatetime'
  | 'address1'
  | 'address2'
  | 'apiKey'
  | 'application'
  | 'applicationId'
  | 'applicationName'
  | 'applicationScope'
  | 'appointmentMethod'
  | 'appointmentNotes'
  | 'appointmentStatus'
  | 'appointmentType'
  | 'appointments'
  | 'buyingAgentID'
  | 'buyingAgentLicenseNumber'
  | 'buyingAgentLicenseState'
  | 'buyingAgentMlsId'
  | 'buyingAgentName'
  | 'buyingAgentStateLicenseAffirmation'
  | 'callBackUrl'
  | 'cancelComments'
  | 'cancelReason'
  | 'city'
  | 'comments'
  | 'confirmationType'
  | 'contactEmail'
  | 'contactFirstName'
  | 'contactLastName'
  | 'contactPhone'
  | 'createdBy'
  | 'createdOn'
  | 'endDatetime'
  | 'id'
  | 'listAgentLicenseNumber'
  | 'listAgentLicenseStateAffirmation'
  | 'listAgentMlsId'
  | 'listAgentName'
  | 'listingAgentLicenseState'
  | 'listingId'
  | 'modifiedBy'
  | 'modifiedOn'
  | 'organization'
  | 'organizationId'
  | 'reoccurringRestrictionsList'
  | 'request'
  | 'requestId'
  | 'requestNotes'
  | 'requestStatus'
  | 'requiredParticipants'
  | 'restrictions'
  | 'showListing'
  | 'showListingId'
  | 'showListings'
  | 'showableEndDate'
  | 'showableStartDate'
  | 'showingInstructions'
  | 'showingMethod'
  | 'showingsAllowed'
  | 'startDatetime'
  | 'state'
  | 'upi'
  | 'zipCode'
  ;


export interface ShowableListing {
  id: UUID;
  application_id: UUID;
  listing_id: string;
  created_on: string;
  upi: string;
  address1: string
  city: string
  state: string
  zip_code: string
  list_agent_mls_id: string
  list_agent_name: string
  list_agent_license_state_affirmation: boolean
  list_agent_license_number: string;
  list_agent_license_state: string;
  showable_start_date: string;
  showable_end_date: string;
  showing_instructions: string;
  required_participants: RequiredParticipants;
  showing_method: ShowingMethod;
  confirmation_type: ConfirmationType;
  showings_allowed: ShowingStatus;
  showing: UUID;
}