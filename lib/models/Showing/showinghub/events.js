const { strict: assert } = require('assert')
const isNil = require('lodash/isNil')
const find = require('lodash/find')
const some = require('lodash/some')
const has = require('lodash/has')

const Orm = require('../../Orm/context')
const Context = require('../../Context')
const { client } = require('./client')

const User = require('../../User/get')
const Agent = require('../../Agent/get')
const Showing = require('../showing/get')
const ShowingRole = require('../role/get')

const {
  RequiredParticipants, ConfirmationType, ShowingMethod, ShowingStatus,
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

const utils = {
  /**
   * @param {RechatShowing['id']} showingId
   * @returns {Promise<RechatShowing>}
   */
  async getShowing (showingId) {
    Orm.enableAssociation('showing.roles')
    return Showing.get(showingId)
  },

  /** @type {(roles: RechatShowingRole[]) => RechatShowingRole} */
  findSellerRole (roles) {
    assert.notEqual(roles?.length || 0, 0, 'Showing roles cannot be empty')

    const sellerAgent = find(roles, { role: 'SellerAgent' })
    if (sellerAgent) { return sellerAgent }

    assert.fail('Impossible state: Seller agent not found')
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

  /**
   * @returns {Pick<ShowableListingRequest, 'dateTimeRestrictionsList' | 'dateTimeReoccurringRestrictionsList'>}
   */
  hubRestrictions () {
    return {
      dateTimeRestrictionsList: [],
      dateTimeReoccurringRestrictionsList: [],
    }
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
    const seller = utils.findSellerRole(roles)
    const user = await utils.findUser(seller)
    assert.ok(user, `User not found for showing role ${seller.id}`)
    const sellerAgent = await utils.findAgent(user)
    assert.ok(sellerAgent, `Seller agent not found for showing ${showingId}`)
    
    await client.api.appListingConfigureshowablelistingCreate({
      // FIXME: What if property info is entered manually?
      listingId: showing.listing || null,
      universalPropertyId: '',

      // TODO: somehow provide app ID here
      // applicationId: '';
      
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

      ...utils.hubRestrictions(),
    })
  },

  /** @param {RechatShowing['id']} showingId */
  async showingUpdated (showingId) {
    throw niy()
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentConfirmed (apptId) {
    throw niy()
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentRequested (apptId) {
    throw niy()
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentDenied (apptId) {
    throw niy()
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentCancelled (apptId) {
    throw niy()
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
