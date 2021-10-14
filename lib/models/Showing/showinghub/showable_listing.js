const { strict: assert } = require('assert')
const find = require('lodash/find')

const config = require('../../../config')
const db = require('../../../utils/db')
const { peanar } = require('../../../utils/peanar')

const Agent = require('../../Agent/get')
const Availability = require('../availability/get')
const Showing = require('../showing/get')
const ShowingRole = require('../role/get')
const User = require('../../User/get')

const utils = require('./utils')
const timespanAdapter = require('./timespan-adapter')
const { client } = require('./client')
const { ShowingMethod, ShowingStatus } = require('./api')

const any = (x) => x

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
/** @typedef {import('./api').ShowListingResponse} ShowListingResponse */
/** @typedef {import('./api').RequestResult} RequestResult */
/** @typedef {import('./types').CommonApiResult} CommonApiResult */

/**
 * @param {ShowListingResponse} showableListing
 * @param {UUID} showing_id
 */
async function insert(showableListing, showing_id) {
  return db.query.promise('showing/hub/showable_listing/insert', [
    showableListing.showListingId,
    showableListing.applicationId,
    showableListing.listingId,
    showableListing.createdOn,
    showableListing.upi,
    showableListing.address1,
    showableListing.city,
    showableListing.state,
    showableListing.zipCode,
    showableListing.listAgentMlsId,
    showableListing.listAgentName,
    showableListing.listAgentLicenseStateAffirmation,
    showableListing.listAgentLicenseNumber,
    showableListing.listingAgentLicenseState,
    showableListing.showableStartDate,
    showableListing.showableEndDate,
    showableListing.showingInstructions,
    showableListing.requiredParticipants,
    showableListing.showingMethod,
    showableListing.confirmationType,
    showableListing.showingsAllowed,
    showing_id,
  ])
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

  const rests = timespanAdapter.hubRestrictions({
    availablities: avails,
    beginDate: utils.getTime(showing.start_date)
  })
  
  /** @type {ShowListingResult} */
  const res = any(
    await client.api.appListingConfigureshowablelistingCreate({
      // FIXME: `listingId` should be the listing's mls_number
      listingId: showing.listing || null,
      universalPropertyId: showing.listing,

      applicationId: config.showinghub.showingapp_id,

      address1: addr('line1'),
      address2: addr('line2'),
      city: addr('city'),
      state: addr('state'),
      zipCode: addr('postalcode'),

      listAgentMlsId: sellerAgent.mlsid,
      listAgentName: utils.fullName(sellerAgent),
      listAgentLicenseNumber: sellerAgent.license_number ?? '-',
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

      dateTimeRestrictionsList: rests.restrictions,
      dateTimeReoccurringRestrictionsList: any(rests.reoccurringRestrictions),
    })
  )

  if (!utils.handleFailure(res)) {
    return
  }

  const hubShowing = res?.results?.[0]
  assert(hubShowing?.showListingId, 'No Hub Showing returned after creating ${showingId}')

  await insert(hubShowing, showingId)
}

/**
 * @param {UUID} showingId
 */
async function update(showingId) {
  const showing = await Showing.get(showingId)
  if (!showing) {
    return
  }

  const id = await findByShowingId(showingId)

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

  const rests = timespanAdapter.hubRestrictions({
    availablities: avails,
    beginDate: utils.getTime(showing.start_date)
  })
  
  /** @type {ShowListingResult} */
  const res = any(
    await client.api.appListingUpdateshowablelistingUpdate(id, {
      // FIXME: `listingId` should be the listing's mls_number
      listingId: showing.listing || null,
      universalPropertyId: showing.listing,

      applicationId: config.showinghub.showingapp_id,

      address1: addr('line1'),
      address2: addr('line2'),
      city: addr('city'),
      state: addr('state'),
      zipCode: addr('postalcode'),

      listAgentMlsId: sellerAgent.mlsid,
      listAgentName: utils.fullName(sellerAgent),
      listAgentLicenseNumber: sellerAgent.license_number ?? '-',
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

      dateTimeRestrictionsList: rests.restrictions,
      dateTimeReoccurringRestrictionsList: rests.reoccurringRestrictions,
    })
  )

  if (!utils.handleFailure(res)) {
    return
  }

  const hubShowing = res?.results?.[0]
  assert(hubShowing?.showListingId, 'No Hub Showing returned after creating ${showingId}')

  await insert(hubShowing, showingId)
}

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./types').ShowableListing[]>}
 */
function getAll(ids) {
  return db.select('showing/hub/showable_listing/get', [ids])
}

/**
 * @param {UUID} id
 * @returns {Promise<import('./types').ShowableListing>}
 */
async function get(id) {
  const [showableListing] = await getAll([id])
  return showableListing
}

/**
 * @param {UUID} showing
 * @returns {Promise<UUID>}
 */
function findByShowingId(showing) {
  return db.selectId('showing/hub/showable_listing/find_by_showing', [showing])
}

module.exports = {
  create: peanar.job({
    handler: create,
    name: 'showinghub/showable_listing.create',
    queue: 'showinghub',
    exchange: 'showinghub',
    error_exchange: 'showinghub.error',
    retry_exchange: 'showinghub.retry',
  }),
  update: peanar.job({
    handler: update,
    name: 'showinghub/showable_listing.update',
    queue: 'showinghub',
    exchange: 'showinghub',
    error_exchange: 'showinghub.error',
    retry_exchange: 'showinghub.retry',
  }),

  get,
  getAll,
  findByShowingId,
}
