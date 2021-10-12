import fetch from 'node-fetch';
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
export var ApplicationScope;
(function (ApplicationScope) {
    ApplicationScope["Read"] = "Read";
    ApplicationScope["Write"] = "Write";
    ApplicationScope["ReadWrite"] = "ReadWrite";
})(ApplicationScope || (ApplicationScope = {}));
/**
 * Defines the AppointmentType.
 */
export var AppointmentType;
(function (AppointmentType) {
    AppointmentType["FirstShowing"] = "FirstShowing";
    AppointmentType["SecondShowing"] = "SecondShowing";
    AppointmentType["ThirdShowing"] = "ThirdShowing";
    AppointmentType["AgentPreview"] = "AgentPreview";
    AppointmentType["Appraisal"] = "Appraisal";
    AppointmentType["BrokerPriceOpinion"] = "BrokerPriceOpinion";
    AppointmentType["Inspection"] = "Inspection";
    AppointmentType["Maintenance"] = "Maintenance";
})(AppointmentType || (AppointmentType = {}));
/**
 * Defines the AppointmentMethod.
 */
export var AppointmentMethod;
(function (AppointmentMethod) {
    AppointmentMethod["InPersonOnly"] = "InPersonOnly";
    AppointmentMethod["VirtualOnly"] = "VirtualOnly";
    AppointmentMethod["InPersonAndVirtual"] = "InPersonAndVirtual";
})(AppointmentMethod || (AppointmentMethod = {}));
/**
 * Defines the CancellationReasonType.
 */
export var CancellationReasonType;
(function (CancellationReasonType) {
    CancellationReasonType["Reschedule"] = "Reschedule";
    CancellationReasonType["PropertyOffMarket"] = "PropertyOffMarket";
    CancellationReasonType["SchedulingConflict"] = "SchedulingConflict";
    CancellationReasonType["Other"] = "Other";
})(CancellationReasonType || (CancellationReasonType = {}));
export var QueryParameterOperation;
(function (QueryParameterOperation) {
    QueryParameterOperation["Equal"] = "Equal";
    QueryParameterOperation["GreaterThan"] = "GreaterThan";
    QueryParameterOperation["GreaterThanOrEqual"] = "GreaterThanOrEqual";
    QueryParameterOperation["LessThan"] = "LessThan";
    QueryParameterOperation["LessThanOrEqual"] = "LessThanOrEqual";
    QueryParameterOperation["Between"] = "Between";
    QueryParameterOperation["NotEqual"] = "NotEqual";
    QueryParameterOperation["NotEmpty"] = "NotEmpty";
    QueryParameterOperation["Like"] = "Like";
    QueryParameterOperation["HasAny"] = "HasAny";
    QueryParameterOperation["Contains"] = "Contains";
    QueryParameterOperation["StartsWith"] = "StartsWith";
    QueryParameterOperation["NotLike"] = "NotLike";
    QueryParameterOperation["ContainsAny"] = "ContainsAny";
})(QueryParameterOperation || (QueryParameterOperation = {}));
export var QuerySortDirection;
(function (QuerySortDirection) {
    QuerySortDirection["Asc"] = "Asc";
    QuerySortDirection["Desc"] = "Desc";
})(QuerySortDirection || (QuerySortDirection = {}));
/**
 * Defines the OrganizationType.
 */
export var OrganizationType;
(function (OrganizationType) {
    OrganizationType["ShowingManager"] = "ShowingManager";
    OrganizationType["MLS"] = "MLS";
    OrganizationType["Brokerage"] = "Brokerage";
    OrganizationType["Syndicator"] = "Syndicator";
})(OrganizationType || (OrganizationType = {}));
/**
 * Defines the RequiredParticipants.
 */
export var RequiredParticipants;
(function (RequiredParticipants) {
    RequiredParticipants["ListingAgent"] = "ListingAgent";
    RequiredParticipants["BuyingAgent"] = "BuyingAgent";
    RequiredParticipants["BothBuyingAndListingAgent"] = "BothBuyingAndListingAgent";
    RequiredParticipants["NoParticipants"] = "NoParticipants";
})(RequiredParticipants || (RequiredParticipants = {}));
/**
 * Defines the ShowingMethod.
 */
export var ShowingMethod;
(function (ShowingMethod) {
    ShowingMethod["InPersonOnly"] = "InPersonOnly";
    ShowingMethod["VirtualOnly"] = "VirtualOnly";
    ShowingMethod["InPersonAndVirtual"] = "InPersonAndVirtual";
})(ShowingMethod || (ShowingMethod = {}));
/**
 * Defines the ConfirmationType.
 */
export var ConfirmationType;
(function (ConfirmationType) {
    ConfirmationType["AutoApprove"] = "AutoApprove";
    ConfirmationType["ConfirmationRequired"] = "ConfirmationRequired";
    ConfirmationType["ShowingInstructionsOnly"] = "ShowingInstructionsOnly";
})(ConfirmationType || (ConfirmationType = {}));
/**
 * Defines the ShowingStatus.
 */
export var ShowingStatus;
(function (ShowingStatus) {
    ShowingStatus["Showable"] = "Showable";
    ShowingStatus["NotShowable"] = "NotShowable";
    ShowingStatus["Suspended"] = "Suspended";
})(ShowingStatus || (ShowingStatus = {}));
export var DayOfWeek;
(function (DayOfWeek) {
    DayOfWeek["Sunday"] = "Sunday";
    DayOfWeek["Monday"] = "Monday";
    DayOfWeek["Tuesday"] = "Tuesday";
    DayOfWeek["Wednesday"] = "Wednesday";
    DayOfWeek["Thursday"] = "Thursday";
    DayOfWeek["Friday"] = "Friday";
    DayOfWeek["Saturday"] = "Saturday";
})(DayOfWeek || (DayOfWeek = {}));
export var ContentType;
(function (ContentType) {
    ContentType["Json"] = "application/json";
    ContentType["FormData"] = "multipart/form-data";
    ContentType["UrlEncoded"] = "application/x-www-form-urlencoded";
})(ContentType || (ContentType = {}));
export class HttpClient {
    constructor(apiConfig = {}) {
        this.baseUrl = "";
        this.securityData = null;
        this.abortControllers = new Map();
        this.customFetch = (...fetchParams) => fetch(...fetchParams);
        this.baseApiParams = {
            credentials: "same-origin",
            headers: {},
            redirect: "follow",
            referrerPolicy: "no-referrer",
        };
        this.setSecurityData = (data) => {
            this.securityData = data;
        };
        this.contentFormatters = {
            [ContentType.Json]: (input) => input !== null && (typeof input === "object" || typeof input === "string") ? JSON.stringify(input) : input,
            [ContentType.FormData]: (input) => Object.keys(input || {}).reduce((formData, key) => {
                const property = input[key];
                formData.append(key, property instanceof Blob
                    ? property
                    : typeof property === "object" && property !== null
                        ? JSON.stringify(property)
                        : `${property}`);
                return formData;
            }, new FormData()),
            [ContentType.UrlEncoded]: (input) => this.toQueryString(input),
        };
        this.createAbortSignal = (cancelToken) => {
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
        this.abortRequest = (cancelToken) => {
            const abortController = this.abortControllers.get(cancelToken);
            if (abortController) {
                abortController.abort();
                this.abortControllers.delete(cancelToken);
            }
        };
        this.request = async ({ body, secure, path, type, query, format, baseUrl, cancelToken, ...params }) => {
            const secureParams = ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
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
                const r = response;
                r.data = null;
                r.error = null;
                const data = !responseFormat
                    ? r
                    : await response[responseFormat]()
                        .then((data) => {
                        if (r.ok) {
                            r.data = data;
                        }
                        else {
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
                if (!response.ok)
                    throw data;
                return data;
            });
        };
        Object.assign(this, apiConfig);
    }
    encodeQueryParam(key, value) {
        const encodedKey = encodeURIComponent(key);
        return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
    }
    addQueryParam(query, key) {
        return this.encodeQueryParam(key, query[key]);
    }
    addArrayQueryParam(query, key) {
        const value = query[key];
        return value.map((v) => this.encodeQueryParam(key, v)).join("&");
    }
    toQueryString(rawQuery) {
        const query = rawQuery || {};
        const keys = Object.keys(query).filter((key) => "undefined" !== typeof query[key]);
        return keys
            .map((key) => (Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key)))
            .join("&");
    }
    addQueryParams(rawQuery) {
        const queryString = this.toQueryString(rawQuery);
        return queryString ? `?${queryString}` : "";
    }
    mergeRequestParams(params1, params2) {
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
export class Api extends HttpClient {
    constructor() {
        super(...arguments);
        this.api = {
            /**
             * No description
             *
             * @tags ApplicationApi
             * @name AppApplicationRegistrationCreate
             * @summary Register a new application.
             * @request POST:/api/app/application/registration
             */
            appApplicationRegistrationCreate: (data, params = {}) => this.request({
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
            appApplicationUpdateUpdate: (id, data, params = {}) => this.request({
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
            appApplicationGetDetail: (id, params = {}) => this.request({
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
            appAppointmentCreate: (data, params = {}) => this.request({
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
            appAppointmentDetail: (id, params = {}) => this.request({
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
            appAppointmentByDetail: (requestid, params = {}) => this.request({
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
            appAppointmentConfirmUpdate: (id, params = {}) => this.request({
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
            appAppointmentCancelUpdate: (id, data, params = {}) => this.request({
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
            appAppointmentDenyUpdate: (id, data, params = {}) => this.request({
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
            appAppointmentUpdateUpdate: (id, data, params = {}) => this.request({
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
            appAppointmentQCreate: (data, query, params = {}) => this.request({
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
            appOrganizationRegistrationCreate: (data, params = {}) => this.request({
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
            appOrganizationUpdateUpdate: (id, data, params = {}) => this.request({
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
            appOrganizationGetDetail: (id, params = {}) => this.request({
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
            appRequestCreate: (data, params = {}) => this.request({
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
            appRequestDetail: (id, params = {}) => this.request({
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
            appRequestUpdateUpdate: (id, data, params = {}) => this.request({
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
            appRequestQCreate: (data, query, params = {}) => this.request({
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
            appListingShowablelistingsQueryCreate: (data, params = {}) => this.request({
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
            appListingConfigureshowablelistingCreate: (data, params = {}) => this.request({
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
            appListingUpdateshowablelistingUpdate: (id, data, params = {}) => this.request({
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
            appListingGetDetail: (id, params = {}) => this.request({
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
            appListingRestrictionsQueryCreate: (data, params = {}) => this.request({
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
            appListingCreateRestrictionCreate: (id, data, params = {}) => this.request({
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
            appListingUpdateRestrictionUpdate: (id, data, params = {}) => this.request({
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
            appListingGetRestrictionDetail: (id, params = {}) => this.request({
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
            appListingRemoveRestrictionDelete: (id, params = {}) => this.request({
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
            appListingReoccurringRestrictionQueryCreate: (data, params = {}) => this.request({
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
            appListingCreateReoccurringRestrictionCreate: (id, data, params = {}) => this.request({
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
            appListingUpdateReoccurringRestrictionUpdate: (id, data, params = {}) => this.request({
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
            appListingGetReoccurringRestrictionDetail: (id, params = {}) => this.request({
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
            appListingRemoveReoccurringRestrictionDelete: (id, params = {}) => this.request({
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
            tokenList: (query, params = {}) => this.request({
                path: `/api/token`,
                method: "GET",
                query: query,
                format: "json",
                ...params,
            }),
        };
    }
}
