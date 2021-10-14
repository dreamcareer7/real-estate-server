const { strict: assert } = require('assert')
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
const Appointment = require('../appointment/get')

const {
  RequiredParticipants, ConfirmationType, ShowingMethod, ShowingStatus,
  CancellationReasonType, AppointmentType, AppointmentMethod,
} = require('./api')

const niy = () => new Error('Not implemented yet')

/** @typedef {import('../showing/types').Showing} RechatShowing */
/** @typedef {import('../role/types').ShowingRole} RechatShowingRole */
/** @typedef {import('../appointment/types').ShowingAppointment} RechatAppointment */
/** @typedef {import('./types').AppointmentStatus} HubAppointmentStatus */
/** @typedef {import('./types').WebhookEvent} WebhookEvent */
/** @typedef {import('./types').WebhookPayload} WebhookPayload */
/** @typedef {import('./types').ShowableListingRequest} ShowableListingRequest */
/** @typedef {(appId: string, payload: WebhookPayload) => Promise<void>} WebhookHandler */
/** @typedef {import('../availability/types').ShowingAvailability} RechatShowingAvailability */

const utils = {
  /**
   * @param {RechatShowing['id']} showingId
   * @returns {Promise<RechatShowing>}
   */
  async getShowing (showingId) {
    Orm.enableAssociation('showing.roles')
    return Showing.get(showingId)
  },

  /** @type {(role: RechatShowingRole) => Promise<IUser> | null} */
  findUser: role => role?.user_id ? User.get(role.user_id) : null,
  
  /** @type {(user: IUser) => Promise<IAgent> | null} */
  findAgent: user => user?.agent ? Agent.get(user.agent) : null,

  /** @type {(val: undefined | number | string | Date) => string | undefined} */
  dateTime (val) {
    if (isNil(val)) { return undefined }
    if (!(val instanceof Date)) { val = new Date(val) }
    if (isNaN(val.getTime())) { throw new Error(`Invalid date: ${val}`) }

    return val.toISOString()
  },

  /** @type {(roles: RechatShowingRole[]) => RequiredParticipants}*/
  hubRequiredParticipants (roles) {
    const RP = RequiredParticipants
    
    const hasSeller = some(roles, { role: 'SellerAgent' })
    const hasBuyer = some(roles, { role: 'BuyerAgent' })

    if (hasSeller && hasBuyer) { return RP.BothBuyingAndListingAgent }
    if (hasSeller) { return RP.ListingAgent }
    if (hasBuyer) { return RP.BuyingAgent }

    return RP.NoParticipants
  },

  /** @type {(showing: RechatShowing) => ConfirmationType} */
  hubConfirmationType ({ approval_type: type, instructions }) {
    const CT = ConfirmationType
    
    if (type !== 'None') { return CT.ConfirmationRequired }
    if (instructions) { return CT.ShowingInstructionsOnly }

    return CT.AutoApprove
  },

  /** @type {(a: IAgent) => string} */
  fullName: a => a.full_name || `${a.first_name} ${a.last_name}`.trim(),

  /** @param {RechatShowingAvailability[]} avails */
  hubRestrictions (avails) {
    return {
      dateTimeRestrictionsList: [],
      dateTimeReoccurringRestrictionsList: [],
    }
  },

  /** 
   * @param {RechatAppointment['id']} apptId 
   * @returns {Promise<string>}
   */
  async findHubAppointmentId (apptId) {
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
   * @param {RechatAppointment} appt
   * @returns {Promise<string>}
   */
  async extractCancellationComment (appt) {
    const warn = () => Context.log(`Warning: Appointment ${appt.id} is not rejected!`)
    
    if (!appt?.approvals?.length) {
      warn()
      return ''
    }

    const approvals = await Approval.getAll(appt.approvals)
    const comments = approvals.filter(a => !a.approved)
      .sort((a1, a2) => {
        const t1 = Math.max(a1.created_at, a1.updated_at)
        const t2 = Math.max(a2.created_at, a2.updated_at)
        return t1 - t2
      })
      .map(a => a.comment)
      .filter(Boolean)
    
    return comments[0] || ''
  },

  /**
   * @param {Date | string | number} dt
   * @returns {number}
   */
  getTime (dt) {
    if (!dt) { return 0 }
    if (!(dt instanceof Date)) { dt = new Date(dt) }

    const time = dt.getTime()
    if (!isNaN(time)) { return time }
   
    throw new Error(`Invalid date: ${dt}`)
  },
}

const emit = {
  /** @param {RechatShowing['id']} showingId */
  async showingCreated (showingId) {
    const showing = await utils.getShowing(showingId)
    if (!showing) { return }

    /** @type {(k: keyof StdAddr) => string} */
    const addr = k => showing.address?.[k] ?? ''

    const roles = await ShowingRole.getAll(showing.roles)
    const seller = find(roles, { role: 'SellerAgent' })
    assert(seller, `No Seller Role found for showing ${showingId}`)
    const user = await utils.findUser(seller)
    assert(user, `User not found for showing role ${seller.id}`)
    const sellerAgent = await utils.findAgent(user)
    assert(sellerAgent, `Seller agent not found for showing ${showingId}`)
    /** @type {RechatShowingAvailability[]} */
    const avails = await Availability.getAll(showing.availabilities)

    await client.api.appListingConfigureshowablelistingCreate({
      // FIXME: What if property info is entered manually?
      listingId: showing.listing || null,
      universalPropertyId: '',

      applicationId: config.showinghub.showingapp_id,
      
      address1: addr('line1'),
      address2: addr('line2'),
      city: addr('city'),
      state: addr('state'),
      zipCode: addr('postalcode'),
      
      listAgentMlsId: sellerAgent.mlsid,
      listAgentName: utils.fullName(sellerAgent),
      listAgentLicenseNumber: sellerAgent.license_number || '-',
      // listAgentLicenseStateAffirmation: true,
      // listingAgentLicenseState: '',
      
      showableStartDate: utils.dateTime(showing.start_date),
      showableEndDate: utils.dateTime(showing.end_date),
      showingInstructions: showing.instructions,

      // comments: '',
      requiredParticipants: utils.hubRequiredParticipants(roles),
      showingMethod: ShowingMethod.InPersonOnly,
      confirmationType: utils.hubConfirmationType(showing),
      showingAllowed: ShowingStatus.Showable,

      ...utils.hubRestrictions(avails),
    })
  },

  /** @param {RechatShowing['id']} showingId */
  async showingUpdated (showingId) {
    throw niy()
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentConfirmed (apptId) {
    const hubApptId = await utils.findHubAppointmentId(apptId)
    assert(hubApptId, `No Hub Appointment found for Rechat Appointment ${apptId}`)

    return client.api.appAppointmentConfirmUpdate(hubApptId)
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentRequested (apptId) {
    const hubApptId = await utils.findHubAppointmentId(apptId)
    if (hubApptId) {
      Context.log(`Warning: Already there is related Hub Appointment (${hubApptId}) fornewly requested Rechat Appointment (${apptId})`)
    }

    const appt = await Appointment.get(apptId)
    if (!appt) { return }
    
    const showing = await utils.getShowing(appt.showing)
    if (!showing) { return }

    const hubShowingId = await utils.findHubShowingId(showing.id)
    assert(hubShowingId, `Related Hub Showing not found for showing ${showing.id}`)

    const startDt = utils.dateTime(appt.time)
    assert(startDt, `Cannot format start datetime for appointment ${apptId}`)

    const dur = showing.duration
    const endDt = utils.dateTime(utils.getTime(appt.time) + dur * 1000)
    assert(endDt, `Cannot format end datetime for appointment ${apptId}`)

    const roles = await ShowingRole.getAll(showing.roles)
    const buyer = find(roles, { role: 'BuyerAgent' })
    const user = buyer ? await utils.findUser(buyer) : null
    const buyerAgent = user ? await utils.findAgent(user) : null
    
    return client.api.appRequestCreate({
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
    })
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentDenied (apptId) {
    const hubApptId = await utils.findHubAppointmentId(apptId)
    if (!hubApptId) {
      return Context.log(`No Hub Appointment found for Rechat Appointment ${apptId}`)
    }

    const appt = await Appointment.get(apptId)

    return client.api.appAppointmentDenyUpdate(hubApptId, {
      appointmentNotes: await utils.extractCancellationComment(appt),
    })
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentCancelled (apptId) {
    const hubApptId = await utils.findHubAppointmentId(apptId)
    if (!hubApptId) {
      return Context.log(`No Hub Appointment found for Rechat Appointment ${apptId}`)
    }

    const appt = await Appointment.get(apptId)

    return client.api.appAppointmentCancelUpdate(hubApptId, {
      cancelReason: CancellationReasonType.Other,
      cancelComments: await utils.extractCancellationComment(appt),
    })
  },
}

const webhook = (function () {
  /** @type {Record<WebhookEvent, WebhookHandler>} */
  const handlers = {
    async ApplicationCreated (appId, payload) {
      throw niy()
    },
    
    async ShowListingCreated (appId, payload) {
      throw niy()
    },
    
    async AppointmentRequested (appId, payload) {
      throw niy()
    },
    
    async ShowListingChanged (appId, payload) {
      throw niy()
    },
    
    async ApplicationChanged (appId, payload) {
      throw niy()
    },

    async AppointmentConfirmed (appId, payload) {
      throw niy()
    },
  }

  /** @type {WebhookHandler} */
  async function handle (appId, payload) {
    const event = payload?.webhookEvent ?? null
    
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
