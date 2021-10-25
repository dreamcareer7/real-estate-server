import fetch from 'node-fetch'

/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/**
 * Defines the ApplicationScope.
 */
export enum ApplicationScope {
  Read = "Read",
  Write = "Write",
  ReadWrite = "ReadWrite",
}

export interface ApplicationRegistrationRequest {
  /** Gets or sets the ApplicationName. */
  applicationName: string;

  /** Gets or sets the ContactEmail. */
  contactEmail: string;

  /** Gets or sets the ContactFirstName. */
  contactFirstName: string;

  /** Gets or sets the ContactLastName. */
  contactLastName: string;

  /** Gets or sets the ContactPhone. */
  contactPhone: string;

  /** Gets or sets the CallBackUrl. */
  callBackUrl: string;

  /** Defines the ApplicationScope. */
  applicationScope?: ApplicationScope;

  /**
   * Gets or sets the OrganizationId.
   * @format uuid
   */
  organizationId?: string;
}

export interface ApplicationRegistrationResponse {
  /** Gets or sets the OrganizationId. */
  organizationId?: string | null;

  /** Gets or sets the ApplicationId. */
  applicationId?: string | null;

  /** Gets or sets the ApiKey. */
  apiKey?: string | null;

  /** Gets or sets the ApplicationName. */
  applicationName?: string | null;

  /** Gets or sets the ApplicationContact. */
  applicationContact?: string | null;

  /** The webhook url where the events will be pushed. */
  callbackUrl?: string | null;

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
 * Defines the Reference.ShowingManager.Hub.Core.Services.Responses.ApplicationRegistrationResult.
 */
export interface ApplicationRegistrationResult {
  isSuccessful?: boolean;
  results?: ApplicationRegistrationResponse[] | null;
  exceptions?: string[] | null;
  message?: string | null;
}

/**
 * Defines the AppointmentType.
 */
export enum AppointmentType {
  FirstShowing = "FirstShowing",
  SecondShowing = "SecondShowing",
  ThirdShowing = "ThirdShowing",
  AgentPreview = "AgentPreview",
  Appraisal = "Appraisal",
  BrokerPriceOpinion = "BrokerPriceOpinion",
  Inspection = "Inspection",
  Maintenance = "Maintenance",
}

/**
 * Defines the AppointmentMethod.
 */
export enum AppointmentMethod {
  InPersonOnly = "InPersonOnly",
  VirtualOnly = "VirtualOnly",
  InPersonAndVirtual = "InPersonAndVirtual",
}

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
export enum CancellationReasonType {
  Reschedule = "Reschedule",
  PropertyOffMarket = "PropertyOffMarket",
  SchedulingConflict = "SchedulingConflict",
  Other = "Other",
}

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

export enum QueryParameterOperation {
  Equal = "Equal",
  GreaterThan = "GreaterThan",
  GreaterThanOrEqual = "GreaterThanOrEqual",
  LessThan = "LessThan",
  LessThanOrEqual = "LessThanOrEqual",
  Between = "Between",
  NotEqual = "NotEqual",
  NotEmpty = "NotEmpty",
  Like = "Like",
  HasAny = "HasAny",
  Contains = "Contains",
  StartsWith = "StartsWith",
  NotLike = "NotLike",
  ContainsAny = "ContainsAny",
}

export interface ApiQueryParameter {
  field?: string | null;
  op?: QueryParameterOperation;
  values?: string[] | null;
}

export enum QuerySortDirection {
  Asc = "Asc",
  Desc = "Desc",
}

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
Standard Entity implementation of Restriction
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
export enum OrganizationType {
  ShowingManager = "ShowingManager",
  MLS = "MLS",
  Brokerage = "Brokerage",
  Syndicator = "Syndicator",
}

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
export enum RequiredParticipants {
  ListingAgent = "ListingAgent",
  BuyingAgent = "BuyingAgent",
  BothBuyingAndListingAgent = "BothBuyingAndListingAgent",
  NoParticipants = "NoParticipants",
}

/**
 * Defines the ShowingMethod.
 */
export enum ShowingMethod {
  InPersonOnly = "InPersonOnly",
  VirtualOnly = "VirtualOnly",
  InPersonAndVirtual = "InPersonAndVirtual",
}

/**
 * Defines the ConfirmationType.
 */
export enum ConfirmationType {
  AutoApprove = "AutoApprove",
  ConfirmationRequired = "ConfirmationRequired",
  ShowingInstructionsOnly = "ShowingInstructionsOnly",
}

/**
 * Defines the ShowingStatus.
 */
export enum ShowingStatus {
  Showable = "Showable",
  NotShowable = "NotShowable",
  Suspended = "Suspended",
}

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

export enum DayOfWeek {
  Sunday = "Sunday",
  Monday = "Monday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
  Thursday = "Thursday",
  Friday = "Friday",
  Saturday = "Saturday",
}

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

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (securityData: SecurityDataType | null) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) => fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  private encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  private addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  private addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter((key) => "undefined" !== typeof query[key]);
    return keys
      .map((key) => (Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key)))
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string") ? JSON.stringify(input) : input,
    [ContentType.FormData]: (input: any) =>
      Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
            ? JSON.stringify(property)
            : `${property}`,
        );
        return formData;
      }, new FormData()),
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  private mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  private createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(`${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`, {
      ...requestParams,
      headers: {
        ...(type && type !== ContentType.FormData ? { "Content-Type": type } : {}),
        ...(requestParams.headers || {}),
      },
      signal: cancelToken ? this.createAbortSignal(cancelToken) : void 0,
      body: typeof body === "undefined" || body === null ? null : payloadFormatter(body),
    }).then(async (response) => {
      const r = response as unknown as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title Reference Showing Manager Hub Web Api
 * @version v1
 * @license Use under License: (https://crmls.org/dataLicense)
 * @termsOfService https://crmls.org
 * @contact Armando Ramirez <aramirez@crmls.org> (https://crmls.org)
 *
 * Reference API Documentation and OpenAPI Exploration Application
 */
export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * No description
     *
     * @tags ApplicationApi
     * @name AppApplicationRegistrationCreate
     * @summary Register a new application.
     * @request POST:/api/app/application/registration
     */
    appApplicationRegistrationCreate: (data: ApplicationRegistrationRequest, params: RequestParams = {}) =>
      this.request<ApplicationRegistrationResult, any>({
        path: `/api/app/application/registration`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ApplicationApi
     * @name AppApplicationUpdateUpdate
     * @summary Update an existing application.
     * @request PUT:/api/app/application/update/{id}
     * @secure
     */
    appApplicationUpdateUpdate: (id: string, data: ApplicationRegistrationRequest, params: RequestParams = {}) =>
      this.request<ApplicationRegistrationResult, void>({
        path: `/api/app/application/update/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ApplicationApi
     * @name AppApplicationGetDetail
     * @summary Get an existing application.
     * @request GET:/api/app/application/get/{id}
     * @secure
     */
    appApplicationGetDetail: (id: string, params: RequestParams = {}) =>
      this.request<ApplicationRegistrationResult, void>({
        path: `/api/app/application/get/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags AppointmentApi
     * @name AppAppointmentCreate
     * @summary Request a new Appointment.
     * @request POST:/api/app/appointment
     * @secure
     */
    appAppointmentCreate: (data: AppointmentRequest, params: RequestParams = {}) =>
      this.request<AppointmentResult, void>({
        path: `/api/app/appointment`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags AppointmentApi
     * @name AppAppointmentDetail
     * @summary Returns an appointment by the appointment Id.
     * @request GET:/api/app/appointment/{id}
     * @secure
     */
    appAppointmentDetail: (id: string, params: RequestParams = {}) =>
      this.request<AppointmentResult, void>({
        path: `/api/app/appointment/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags AppointmentApi
     * @name AppAppointmentByDetail
     * @summary The appointment created by the request Id.
     * @request GET:/api/app/appointment/by/{requestid}
     * @secure
     */
    appAppointmentByDetail: (requestid: string, params: RequestParams = {}) =>
      this.request<AppointmentResult, void>({
        path: `/api/app/appointment/by/${requestid}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags AppointmentApi
     * @name AppAppointmentConfirmUpdate
     * @summary Appointment confirmation endpoint.
     * @request PUT:/api/app/appointment/confirm/{id}
     * @secure
     */
    appAppointmentConfirmUpdate: (id: string, params: RequestParams = {}) =>
      this.request<AppointmentResult, void>({
        path: `/api/app/appointment/confirm/${id}`,
        method: "PUT",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags AppointmentApi
     * @name AppAppointmentCancelUpdate
     * @summary The appointment cancellation request endpoint.
     * @request PUT:/api/app/appointment/cancel/{id}
     * @secure
     */
    appAppointmentCancelUpdate: (id: string, data: CancellationRequest, params: RequestParams = {}) =>
      this.request<AppointmentResult, void>({
        path: `/api/app/appointment/cancel/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags AppointmentApi
     * @name AppAppointmentDenyUpdate
     * @summary The deny request endpoint.
     * @request PUT:/api/app/appointment/deny/{id}
     * @secure
     */
    appAppointmentDenyUpdate: (id: string, data: DenyRequest, params: RequestParams = {}) =>
      this.request<AppointmentResult, void>({
        path: `/api/app/appointment/deny/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags AppointmentApi
     * @name AppAppointmentUpdateUpdate
     * @summary The update appointment endpoint.
     * @request PUT:/api/app/appointment/update/{id}
     * @secure
     */
    appAppointmentUpdateUpdate: (id: string, data: AppointmentUpdateRequest, params: RequestParams = {}) =>
      this.request<AppointmentResult, void>({
        path: `/api/app/appointment/update/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
 * No description
 * 
 * @tags AppointmentApi
 * @name AppAppointmentQCreate
 * @summary Return specific page of Appointments
Note: Default is page zero with a max size of 50 items
 * @request POST:/api/app/appointment/q
 * @secure
 */
    appAppointmentQCreate: (data: ApiQuery, query?: { f?: string | null }, params: RequestParams = {}) =>
      this.request<AppointmentQueryResult, void>({
        path: `/api/app/appointment/q`,
        method: "POST",
        query: query,
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrganizationApi
     * @name AppOrganizationRegistrationCreate
     * @summary The organization registration endpoint.
     * @request POST:/api/app/organization/registration
     */
    appOrganizationRegistrationCreate: (data: OrganizationRegistrationRequest, params: RequestParams = {}) =>
      this.request<OrganizationRegistrationResult, any>({
        path: `/api/app/organization/registration`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrganizationApi
     * @name AppOrganizationUpdateUpdate
     * @summary The UpdateOrganization.
     * @request PUT:/api/app/organization/update/{id}
     * @secure
     */
    appOrganizationUpdateUpdate: (id: string, data: OrganizationUpdateRequest, params: RequestParams = {}) =>
      this.request<OrganizationRegistrationResult, void>({
        path: `/api/app/organization/update/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrganizationApi
     * @name AppOrganizationGetDetail
     * @summary The GetOrganization.
     * @request GET:/api/app/organization/get/{id}
     * @secure
     */
    appOrganizationGetDetail: (id: string, params: RequestParams = {}) =>
      this.request<OrganizationRegistrationResult, void>({
        path: `/api/app/organization/get/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags RequestApi
     * @name AppRequestCreate
     * @summary Creates a new request.
     * @request POST:/api/app/request
     * @secure
     */
    appRequestCreate: (data: NewRequest, params: RequestParams = {}) =>
      this.request<RequestResult, void>({
        path: `/api/app/request`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags RequestApi
     * @name AppRequestDetail
     * @summary Get the request by the requestId.
     * @request GET:/api/app/request/{id}
     * @secure
     */
    appRequestDetail: (id: string, params: RequestParams = {}) =>
      this.request<RequestResult, void>({
        path: `/api/app/request/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags RequestApi
     * @name AppRequestUpdateUpdate
     * @summary The UpdateRequest.
     * @request PUT:/api/app/request/update/{id}
     * @secure
     */
    appRequestUpdateUpdate: (id: string, data: UpdateRequest, params: RequestParams = {}) =>
      this.request<RequestResult, void>({
        path: `/api/app/request/update/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
 * No description
 * 
 * @tags RequestApi
 * @name AppRequestQCreate
 * @summary Return specific page of Requests
Note: Default is page zero with a max size of 50 items
 * @request POST:/api/app/request/q
 * @secure
 */
    appRequestQCreate: (data: ApiQuery, query?: { f?: string | null }, params: RequestParams = {}) =>
      this.request<RequestQueryResult, void>({
        path: `/api/app/request/q`,
        method: "POST",
        query: query,
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
 * No description
 * 
 * @tags ShowListingApi
 * @name AppListingShowablelistingsQueryCreate
 * @summary Returns a specific page of Showable Listings
Note: Default is page zero with a max size of 50 items.
 * @request POST:/api/app/listing/showablelistings/query
 * @secure
 */
    appListingShowablelistingsQueryCreate: (data: ApiQuery, params: RequestParams = {}) =>
      this.request<ShowableListingQueryResult, void>({
        path: `/api/app/listing/showablelistings/query`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ShowListingApi
     * @name AppListingConfigureshowablelistingCreate
     * @summary Creates a showable listing record.
     * @request POST:/api/app/listing/configureshowablelisting
     * @secure
     */
    appListingConfigureshowablelistingCreate: (data: ShowableListingRequest, params: RequestParams = {}) =>
      this.request<ShowListingResult, void>({
        path: `/api/app/listing/configureshowablelisting`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ShowListingApi
     * @name AppListingUpdateshowablelistingUpdate
     * @summary Updates a showable listing record.
     * @request PUT:/api/app/listing/updateshowablelisting/{id}
     * @secure
     */
    appListingUpdateshowablelistingUpdate: (
      id: string,
      data: ShowableListingUpdateRequest,
      params: RequestParams = {},
    ) =>
      this.request<ShowListingResult, void>({
        path: `/api/app/listing/updateshowablelisting/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ShowListingApi
     * @name AppListingGetDetail
     * @summary Gets a showable listing record.
     * @request GET:/api/app/listing/get/{id}
     * @secure
     */
    appListingGetDetail: (id: string, params: RequestParams = {}) =>
      this.request<ShowListingResult, void>({
        path: `/api/app/listing/get/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 * 
 * @tags ShowListingApi
 * @name AppListingRestrictionsQueryCreate
 * @summary Returns specific page of Date/Time Restrictions
Note: Default is page zero with a max size of 50 items.
 * @request POST:/api/app/listing/restrictions/query
 * @secure
 */
    appListingRestrictionsQueryCreate: (data: ApiQuery, params: RequestParams = {}) =>
      this.request<RestrictionQueryResult, void>({
        path: `/api/app/listing/restrictions/query`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ShowListingApi
     * @name AppListingCreateRestrictionCreate
     * @summary Create a date/time restriction for a show listing.
     * @request POST:/api/app/listing/create_restriction/{id}
     * @secure
     */
    appListingCreateRestrictionCreate: (id: string, data: DateTimeRestrictions, params: RequestParams = {}) =>
      this.request<RestrictionsResult, void>({
        path: `/api/app/listing/create_restriction/${id}`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ShowListingApi
     * @name AppListingUpdateRestrictionUpdate
     * @summary Will update an existing show listing date/time restriction record.
     * @request PUT:/api/app/listing/update_restriction/{id}
     * @secure
     */
    appListingUpdateRestrictionUpdate: (id: number, data: DateTimeRestrictions, params: RequestParams = {}) =>
      this.request<RestrictionsResult, void>({
        path: `/api/app/listing/update_restriction/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ShowListingApi
     * @name AppListingGetRestrictionDetail
     * @summary Will get a show listing restriction record.
     * @request GET:/api/app/listing/get/restriction/{id}
     * @secure
     */
    appListingGetRestrictionDetail: (id: number, params: RequestParams = {}) =>
      this.request<RestrictionsResult, void>({
        path: `/api/app/listing/get/restriction/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ShowListingApi
     * @name AppListingRemoveRestrictionDelete
     * @summary Will remove a show listing restriction record.
     * @request DELETE:/api/app/listing/remove/restriction/{id}
     * @secure
     */
    appListingRemoveRestrictionDelete: (id: number, params: RequestParams = {}) =>
      this.request<RestrictionsResult, void>({
        path: `/api/app/listing/remove/restriction/${id}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 * 
 * @tags ShowListingApi
 * @name AppListingReoccurringRestrictionQueryCreate
 * @summary Returns specific page of Date/Time Reoccurring Restrictions
Note: Default is page zero with a max size of 50 items.
 * @request POST:/api/app/listing/reoccurring_restriction/query
 * @secure
 */
    appListingReoccurringRestrictionQueryCreate: (data: ApiQuery, params: RequestParams = {}) =>
      this.request<ReoccurringRestrictionQueryResult, void>({
        path: `/api/app/listing/reoccurring_restriction/query`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ShowListingApi
     * @name AppListingCreateReoccurringRestrictionCreate
     * @summary Create a reoccurring date/time restriction for a show listing.
     * @request POST:/api/app/listing/create_reoccurring_restriction/{id}
     * @secure
     */
    appListingCreateReoccurringRestrictionCreate: (
      id: string,
      data: DateTimeReoccurringRestrictions[] | null,
      params: RequestParams = {},
    ) =>
      this.request<ReoccurringRestrictionListResult, void>({
        path: `/api/app/listing/create_reoccurring_restriction/${id}`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ShowListingApi
     * @name AppListingUpdateReoccurringRestrictionUpdate
     * @summary Will update an existing show listing reoccurring restriction record.
     * @request PUT:/api/app/listing/update_reoccurring_restriction/{id}
     * @secure
     */
    appListingUpdateReoccurringRestrictionUpdate: (
      id: number,
      data: DateTimeReoccurringRestrictions,
      params: RequestParams = {},
    ) =>
      this.request<ReocurringRestrictionsResult, void>({
        path: `/api/app/listing/update_reoccurring_restriction/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ShowListingApi
     * @name AppListingGetReoccurringRestrictionDetail
     * @summary Will get a show listing reoccurring restriction record.
     * @request GET:/api/app/listing/get/reoccurring_restriction/{id}
     * @secure
     */
    appListingGetReoccurringRestrictionDetail: (id: number, params: RequestParams = {}) =>
      this.request<ReocurringRestrictionsResult, void>({
        path: `/api/app/listing/get/reoccurring_restriction/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ShowListingApi
     * @name AppListingRemoveReoccurringRestrictionDelete
     * @summary Removes a show listing reoccurring restriction.
     * @request DELETE:/api/app/listing/remove/reoccurring_restriction/{id}
     * @secure
     */
    appListingRemoveReoccurringRestrictionDelete: (id: number, params: RequestParams = {}) =>
      this.request<ReocurringRestrictionsResult, void>({
        path: `/api/app/listing/remove/reoccurring_restriction/${id}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Token
     * @name TokenList
     * @request GET:/api/token
     */
    tokenList: (query?: { apiKey?: string | null }, params: RequestParams = {}) =>
      this.request<AccessTokenResult, any>({
        path: `/api/token`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),
  };
}
