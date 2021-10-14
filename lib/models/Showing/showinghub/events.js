const { strict: assert } = require('assert')
const isEmpty = require('lodash/isEmpty')
const isNil = require('lodash/isNil')
const find = require('lodash/find')
const some = require('lodash/some')
const has = require('lodash/has')

const Orm = require('../../Orm/context')
const Context = require('../../Context')
const { client } = require('./client')
const config = require('../../../config')

const User = require('../../User/get')
const Agent = require('../../Agent/get')
const Approval = require('../approval/get')
const Showing = require('../showing/get')
const ShowingRole = require('../role/get')
const Availability = require('../availability/get')
const Appointment = {
  ...require('../appointment/get'),
  ...require('../appointment/create'),
}

const {
  CancellationReasonType, AppointmentType, AppointmentMethod,
} = require('./api')

const utils = require('./utils')

const ShowableListing = require('./showable_listing')
const AppointmentRequest = require('./appointment')

const niy = () => new Error('Not implemented yet')
const noop = msg => Context.log(`${msg}. Nothing here to do...`)
const any = x => x

/** @typedef {import('../showing/types').Showing} RechatShowing */
/** @typedef {import('../role/types').ShowingRole} RechatShowingRole */
/** @typedef {import('../appointment/types').ShowingAppointment} RechatAppointment */
/** @typedef {import('./types').AppointmentStatus} HubAppointmentStatus */
/** @typedef {import('./types').WebhookEvent} WebhookEvent */
/** @typedef {import('./types').WebhookPayload} WebhookPayload */
/** @typedef {import('./types').ShowableListingRequest} ShowableListingRequest */
/** @typedef {(appId: string, payload: WebhookPayload) => Promise<void>} WebhookHandler */
/** @typedef {import('../availability/types').ShowingAvailability} RechatShowingAvailability */
/** @typedef {import('./api').ShowListingResult} ShowListingResult */
/** @typedef {import('./api').RequestResult} RequestResult */
/** @typedef {import('./types').CommonApiResult} CommonApiResult */

const dao = {
  /**
   * @param {UUID} showingId
   * @returns {Promise<RechatShowing>}
   */
  async getShowing (showingId) {
    Orm.enableAssociation('showing.roles')
    return Showing.get(showingId)
  },

  /** 
   * @param {UUID} apptId 
   * @returns {Promise<string>}
   */
  async findHubAppointmentId (apptId) {
    throw niy()
  },

  /** 
   * @param {UUID} apptId 
   * @returns {Promise<string>}
   */
  async findRequestId (apptId) {
    throw niy()
  },
  
  /**
   * @param {UUID} showingId
   * @returns {Promise<string>}
   */
  async findHubShowingId (showingId) {
    throw niy()
  },

  /**
   * @param {string} hubApptId
   * @returns {Promise<UUID>}
   */
  async findRechatAppointmentId (hubApptId) {
    throw niy()
  },

  /**
   * @param {string} requestId
   * @returns {Promise<RechatAppointment['id']>}
   */
  async findRechatAppointmentIdByRequestId (requestId) {
    throw niy()
  },

  /**
   * @param {string} hubShowingId
   * @returns {Promise<UUID>}
   */
  async findRechatShowingId (hubShowingId) {
    throw niy()
  },

  /**
   * @param {UUID} showingId
   * @param {string} hubShowingId
   */
  async relateToHubShowing (showingId, hubShowingId) {
    throw niy()
  },

  /**
   * @param {UUID} apptId
   * @param {string} requestId
   */
  async relateToRequest (apptId, requestId) {
    throw niy()
  },
}

const emit = {
  /** @param {UUID} showingId */
  showingCreated (showingId) {
    return ShowableListing.create(showingId)
  },

  /** @param {UUID} showingId */
  async showingUpdated (showingId) {
    throw niy()
  },

  /** @param {UUID} apptId */
  async appointmentConfirmed (apptId) {
    return AppointmentRequest.confirm(apptId)
  },

  /** @param {UUID} apptId */
  appointmentRequested (apptId) {
    return AppointmentRequest.request(apptId)
  },

  /** @param {UUID} apptId */
  async appointmentDenied (apptId) {
    return AppointmentRequest.reject(apptId)
  },

  /** 
   * @param {UUID} apptId
   * @param {CancellationReasonType=} [reason=CancellationReasonType.Other]
   */
  async appointmentCancelled (apptId, reason = CancellationReasonType.Other) {
    return AppointmentRequest.cancel(apptId, reason)
  },

  /** @param {UUID} apptId */
  async appointmentRescheduled (apptId) {    
    await emit.appointmentCancelled(apptId, CancellationReasonType.Reschedule)
    await emit.appointmentRequested(apptId)
  },
}

const webhook = (function () {
  /** @type {Record<WebhookEvent, WebhookHandler>} */
  const handlers = {
    async ApplicationCreated (appId, payload) {
      noop('Appliction created')
    },
    
    async ShowListingCreated (appId, payload) {
      noop('Show[able] Listing created')
    },
    
    async ShowListingChanged (appId, payload) {
      noop('Show[able] Listing changed')
    },
    
    async ApplicationChanged (appId, payload) {
      noop('Application changed')
    },

    async AppointmentRequested (_, { data }) {
      if (!Array.isArray(data?.appointments) || !data.appointments.length) {
        return
      }

      const hubShowingId = data?.showListingId
      if (hubShowingId) { throw Error.Validation('Missing Show Listing ID') }

      const showingId = await dao.findRechatShowingId(hubShowingId)
      assert(showingId, `No related showing found for Hub Showing ${hubShowingId}`)

      for (const ha of data.appointments) {
        const contact = await utils.buyerAgentContactInfo(ha)
        const dt = ha.actualStartDatetime
              || data.actualStartDatetime
              || data.startDatetime

        const isoDate = new Date(dt).toISOString()

        await Appointment.request(showingId, {
          source: 'ShowingHub',
          time: isoDate,
          contact,
        })

        // TODO: handle auto-approve
        // TODO: persist ShowingHub-related model(s)
      }
    },

    async AppointmentConfirmed (_, { data }) {
      let apptId = await dao.findRechatAppointmentId(data.id)

      if (!apptId) {
        apptId = await dao.findRechatAppointmentIdByRequestId(data.requestId)
      }

      if (!apptId) {
        return Context.log(`No related appointment found for Hub Appointment ${data.id}`)
      }

      // TODO: Confirm the appointment
    },
  }

  /** @type {WebhookHandler} */
  async function handle (appId, payload) {
    const event = payload?.webhookEvent ?? null

    if (!appId && payload.applicationId) {
      appId = payload.applicationId
    }
    
    if (!event) {
      return Context.log(`Missing webhook event: ${JSON.stringify(payload)}`)
    } else if (!has(handlers, event)) {
      return Context.log(`No handler found for webhook event: ${event}`)
    }

    return handlers[event](appId, payload)
  }

  return { handle, handlers }
})()

module.exports = { emit, webhook }
