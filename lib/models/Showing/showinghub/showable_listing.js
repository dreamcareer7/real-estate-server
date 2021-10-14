const { strict: assert } = require('assert')
const isNil = require('lodash/isNil')
const find = require('lodash/find')
const some = require('lodash/some')
const has = require('lodash/has')

const config = require('../../../config')
const db = require('../../../utils/db')
const { peanar } = require('../../../utils/peanar')

const Context = require('../../Context')
const Agent = require('../../Agent/get')
const Appointment = {
  ...require('../appointment/get'),
  ...require('../appointment/create'),
}
const Approval = require('../approval/get')
const Availability = require('../availability/get')
const Showing = require('../showing/get')
const ShowingRole = require('../role/get')
const User = require('../../User/get')

const utils = require('./utils')
const { client } = require('./client')
const {
  ShowingMethod, ShowingStatus,
  CancellationReasonType, AppointmentType, AppointmentMethod,
} = require('./api')

const any = x => x
const niy = () => new Error('Not implemented yet')
const noop = msg => Context.log(`${msg}. Nothing here to do...`)


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

async function insert(showableListing) {

}

/**
 * @param {UUID} showingId 
 */
async function create(showingId) {
  const showing = await Showing.get(showingId)
  if (!showing) {
    return
  }

  /** @type {(k: keyof StdAddr) => string} */
  const addr = (k) => showing.address?.[k] ?? ''

  const roles = await ShowingRole.getAll(showing.roles)
  const seller = find(roles, { role: 'SellerAgent' })
  assert(seller, `No Seller Role found for showing ${showingId}`)
  const user = await User.get(seller.user_id)
  assert(user, `User not found for showing role ${seller.id}`)
  const sellerAgent = await Agent.get(user.agent)
  assert(sellerAgent, `Seller agent not found for showing ${showingId}`)
  /** @type {RechatShowingAvailability[]} */
  const avails = await Availability.getAll(showing.availabilities)

  /** @type {ShowListingResult} */
  const res = any(
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
      listAgentLicenseStateAffirmation: true,
      listingAgentLicenseState: 'PA',

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
  )

  if (!utils.handleFailure(res)) {
    return
  }

  const hubShowing = res?.results?.[0]
  assert(hubShowing?.showListingId, 'No Hub Showing returned after creating ${showingId}')

  // await dao.relateToHubShowing(showingId, hubShowing.showListingId)
}

module.exports = {
  create: peanar.job({
    handler: create,
    name: 'showinghub/showable_listing.create',
    queue: 'showinghub',
    exchange: 'showinghub',
    error_exchange: 'showinghub.error',
    retry_exchange: 'showinghub.retry'
  })
}
