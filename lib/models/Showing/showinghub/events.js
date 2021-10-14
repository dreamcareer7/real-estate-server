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
  ShowingMethod, ShowingStatus,
  CancellationReasonType, AppointmentType, AppointmentMethod,
} = require('./api')

const utils = require('./utils')

const ShowableListing = require('./showable_listing')

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
   * @param {RechatShowing['id']} showingId
   * @returns {Promise<RechatShowing>}
   */
  async getShowing (showingId) {
    Orm.enableAssociation('showing.roles')
    return Showing.get(showingId)
  },

  /** 
   * @param {RechatAppointment['id']} apptId 
   * @returns {Promise<string>}
   */
  async findHubAppointmentId (apptId) {
    throw niy()
  },

  /** 
   * @param {RechatAppointment['id']} apptId 
   * @returns {Promise<string>}
   */
  async findRequestId (apptId) {
    throw niy()
  },
  
  /**
   * @param {RechatShowing['id']} showingId
   * @returns {Promise<string>}
   */
  async findHubShowingId (showingId) {
    throw niy()
  },

  /**
   * @param {string} hubApptId
   * @returns {Promise<RechatAppointment['id']>}
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
   * @returns {Promise<RechatShowing['id']>}
   */
  async findRechatShowingId (hubShowingId) {
    throw niy()
  },

  /**
   * @param {RechatShowing['id']} showingId
   * @param {string} hubShowingId
   */
  async relateToHubShowing (showingId, hubShowingId) {
    throw niy()
  },

  /**
   * @param {RechatShowing['id']} apptId
   * @param {string} requestId
   */
  async relateToRequest (apptId, requestId) {
    throw niy()
  },
}

const emit = {
  /** @param {RechatShowing['id']} showingId */
  showingCreated (showingId) {
    return ShowableListing.create(showingId)
  },

  /** @param {RechatShowing['id']} showingId */
  async showingUpdated (showingId) {
    throw niy()
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentConfirmed (apptId) {
    const hubApptId = await dao.findHubAppointmentId(apptId)
    assert(hubApptId, `No Hub Appointment found for Rechat Appointment ${apptId}`)

    return client.api.appAppointmentConfirmUpdate(hubApptId)
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentRequested (apptId) {
    const hubApptId = await dao.findHubAppointmentId(apptId)
    if (hubApptId) {
      Context.log(`Warning: Already there is related Hub Appointment (${hubApptId}) fornewly requested Rechat Appointment (${apptId})`)
    }

    const appt = await Appointment.get(apptId)
    if (!appt) { return }
    
    const showing = await dao.getShowing(appt.showing)
    if (!showing) { return }

    const hubShowingId = await dao.findHubShowingId(showing.id)
    assert(hubShowingId, `Related Hub Showing not found for showing ${showing.id}`)

    const startDt = utils.dateTime(appt.time)
    assert(startDt, `Cannot format start datetime for appointment ${apptId}`)

    const dur = showing.duration
    const endDt = utils.dateTime(utils.getTime(appt.time) + dur * 1000)
    assert(endDt, `Cannot format end datetime for appointment ${apptId}`)

    const roles = await ShowingRole.getAll(showing.roles)
    const buyer = find(roles, { role: 'BuyerAgent' })
    const user = buyer ? await User.get(buyer.user_id) : null
    const buyerAgent = user ? await Agent.get(user.agent) : null

    /** @type {RequestResult} */
    const res = any(await client.api.appRequestCreate({
      startDatetime: startDt,
      endDatetime: endDt,
      appointmentType: AppointmentType.FirstShowing,
      appointmentMethod: AppointmentMethod.InPersonOnly,

      buyingAgentID: buyerAgent?.id ?? '-',
      buyingAgentName: buyerAgent ? utils.fullName(buyerAgent) : '-',
      buyingAgentLicenseNumber: buyerAgent?.license_number ?? '-',
      buyingAgentLicenseState: '-',
      buyingAgentMlsId: buyerAgent?.mlsid ?? '-',
      buyingAgentStateLicenseAffirmation: true,

      requestNotes: '',
      
      showListingId: hubShowingId,
    }))

    // XXX: do we need to create an appointment here?

    if (!utils.handleFailure(res)) { return }

    const request = res?.results?.[0]
    assert(request?.requestId, `No Request [ID] returned after creating request for appointment ${apptId}`)

    await dao.relateToRequest(apptId, request.requestId)
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentDenied (apptId) {
    const hubApptId = await dao.findHubAppointmentId(apptId)
    if (!hubApptId) {
      return Context.log(`No Hub Appointment found for Rechat Appointment ${apptId}`)
    }

    const appt = await Appointment.get(apptId)

    return client.api.appAppointmentDenyUpdate(hubApptId, {
      appointmentNotes: await utils.extractCancellationComment(appt),
    })
  },

  /** 
   * @param {RechatAppointment['id']} apptId
   * @param {CancellationReasonType=} [reason=CancellationReasonType.Other]
   */
  async appointmentCancelled (apptId, reason = CancellationReasonType.Other) {
    const hubApptId = await dao.findHubAppointmentId(apptId)
    if (!hubApptId) {
      return Context.log(`No Hub Appointment found for Rechat Appointment ${apptId}`)
    }

    const appt = await Appointment.get(apptId)

    return client.api.appAppointmentCancelUpdate(hubApptId, {
      cancelReason: reason,
      cancelComments: await utils.extractCancellationComment(appt),
    })
  },

  /** @param {RechatAppointment['id']} apptId */
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
