const { strict: assert } = require('assert')
const querystring = require('querystring')
const zip = require('lodash/zip')
const moment = require('moment-timezone')

const config = require('../../../config')
const Crypto = require('../../Crypto')
const Branch = require('../../Branch')

/** @typedef {import('./types').ShowingAppointmentPopulated} ShowingAppointmentPopulated */
/** @typedef {import('../role/types').ShowingRolePopulated} ShowingRolePopulated */
/** @typedef {import('../showing/types').ShowingPopulated} ShowingPopulated */
/** @typedef {import('../role/types').TShowingRole} TShowingRole */
/** @typedef {import('./types').ShowingAppointment} ShowingAppointment */
/** @typedef {import('../approval/types').ShowingApproval} ShowingApproval */
/** @typedef {{ id: UUID, time: Date, showing: { id: UUID } }} PartialShowingAppointment */

/** @param {ShowingAppointmentPopulated} appt */
async function extractListingBindings (appt) {
  const showing = appt?.showing ?? {}

  const address = showing?.address?.full ||
    showing?.listing?.property?.address?.full_address
  
  return {
    mapUrl: await staticMapForProperty(showing.listing?.property),
    photoUrl: /** @type {*} */(showing.listing)?.cover_image_url,
    price: showing.listing?.price ?? 0,
    address,
    beds: showing.listing?.property.bedroom_count,
    bathrooms: showing.listing?.property.bathroom_count,
    area: Math.floor(toSquareFoot(showing.listing?.property.square_meters)),
  }
}

/** @param {ShowingAppointmentPopulated} appt */
async function extractSellerContactBindings (appt) {
  const sellerRole = await findRole(appt?.showing, 'SellerAgent')
  const sellerUser = sellerRole.user ?? {}
  
  return {
    avatarUrl: sellerUser.profile_image_url,
    fullName: `${sellerUser.first_name} ${sellerUser.last_name}`.trim(),
    company: '', // TODO: extract company/brokerage name
    phone: sellerRole.phone_number || sellerUser.phone_number,
    email: sellerRole.email || sellerUser.email,
  }
}

/** @param {ShowingAppointmentPopulated} appt */
async function extractBuyerContactBindings (appt) {
  const buyer = appt.contact

  const fullName = buyer.display_name ||
    `${buyer.first_name} ${buyer.last_name}`.trim() ||
    buyer.nickname
  
  const phone = buyer.primary_phone_number ||
    buyer.phone_number ||
    buyer.phone_numbers?.[0]

  const email = buyer.primary_email ||
    buyer.email ||
    buyer.emails?.[0]

  return {
    avatarUrl: buyer.cover_image_url,
    company: buyer.company,
    fullName,
    phone,
    email
  }
}

/**
 * @param {number | undefined | null} squareMeter
 * @returns {number}
 */
function toSquareFoot (squareMeter) {
  return (squareMeter || 0) * 10.763910416709722
}

/** 
 * @param {ShowingPopulated} showing
 * @param {TShowingRole} role
 * @returns {Promise<ShowingRolePopulated>}
 */
async function findRole (showing, role) {
  assert(Array.isArray(showing?.roles), 'showing.roles is not array')

  const found = showing.roles.find(r => r.role === role)
  assert(found && typeof found === 'object', 'found role is not an object')

  return found
}

/**
 * @param {object} opts
 * @param {string | [number, number]} [opts.size]
 * @param {string=} [opts.key]
 * @param {(string | [number, number])=} [opts.center]
 * @param {number=} [opts.zoom]
 * @param {(1 | 2)=} [opts.scale]
 * @param {('png8' | 'png32' | 'gif' | 'jpg' | 'jpg-baseline')=} [opts.format]
 * @param {('roadmap' | 'satellite' | 'terrain' | 'hybrid')=} [opts.maptype]
 * @param {string=} [opts.language]
 * @param {string=} [opts.region]
 * @param {string[]=} [opts.markers]
 * @param {string[]=} [opts.path]
 * @param {string[]=} [opts.visible]
 * @param {string=} [opts.style]
 * @param {string=} [opts.signature]
 * @returns {Promise<string>}
 */
async function staticMap (opts) {
  const centerOrMarkers = opts.center || opts.markers
  assert(centerOrMarkers, 'at least one of markers and center must be passed')

  opts = {
    ...opts,
    size: opts.size ?? [512, 179],
    zoom: opts.zoom ?? 15,
    key: opts.key ?? config.google.staticmap_api_key ?? config.google.api_key,
  }
  
  Array.isArray(opts.size) && (opts.size = opts.size.join('x'))
  Array.isArray(opts.center) && (opts.center = opts.center.join(','))

  const STATICMAP_URL = 'https://maps.googleapis.com/maps/api/staticmap'
  const qstr = querystring.stringify(opts)

  /* TODO: Google HIGHLY recommends to use signatures for static maps. */
  return `${STATICMAP_URL}?${qstr}`
}

/** @param {IProperty | undefined} prop */
async function staticMapForProperty (prop) {
  /** @type {*} */
  const addr = prop?.address
  
  /** @type {[number, number]} */
  const center = [addr?.location?.latitude, addr?.location?.longitude]
  if (!center[0] || !center[1]) { return null }

  return staticMap({ center, markers: [center.join(',')] })
}

/**
 * @param {'reschedule' | 'cancel' | 'feedback'} action
 * @param {PartialShowingAppointment} appt
 */
async function shortLinkTo (action, appt) {
  const token = Crypto.encryptObject({
    id: appt.id,
    time: (appt.time instanceof Date) ? appt.time.toISOString() : appt.time,
  })
  const url = `${config.showings.domain}/showings/appointments/${token}/${action}`
  
  return Branch.createURL({
    action: `${action.toUpperCase()}_SHOWING_APPOINTMENT`,
    appointment_id: appt.id,
    $ios_url: url,
    $android_url: url,
    $desktop_url: url,
    $fallback_url: url,
    $web_only: true,
  }, {
    branch_key: config.branch.showingapp.key,
  })
}

/**
 * @param {'confirm' | 'cancel' | 'reject'} action
 * @param {PartialShowingAppointment} appt
 * @param {IModel} user
 */
async function shortApprovalLinkTo (action, appt, user) {
  assert.equal(typeof appt?.showing?.id, 'string', 'appt.showing.id must be string')
  
  const token = Crypto.encryptObject({
    id: appt.id,
    user: user.id,
    action,
    time: (appt.time instanceof Date) ? appt.time.toISOString() : appt.time,
  })

  const baseUrl = config.showings.domain
  const url = `${baseUrl}/showings/appointments/approval/${token}/${action}`

  return Branch.createURL({
    action: `${action.toUpperCase()}_SHOWING_APPOINTMENT`,
    appointment_id: appt.id,
    showing_id: appt.showing.id,
    // $ios_url: url,
    // $android_url: url,
    $desktop_url: url,
    $fallback_url: url,
    // $web_only: true,
  }, {
    branch_key: config.branch.showingapp.key,
  })
}

/**
 * @param {ShowingAppointmentPopulated} appt
 * @param {boolean} [approved=true]
 * @returns {Promise<*>}
 */
async function extractApprovalBindings (appt, approved = true) {
  const approval = appt?.approvals?.find?.(a => a.approved === approved)
  if (!approval) { return null }

  const role = /** @type {ShowingRolePopulated} */(/** @type {any} */(approval.role))
  
  return {
    fullName: `${role.first_name} ${role.last_name}`,
    role: role.role,
    comment: approval.comment,
  }
}

/**
 * @param {ShowingAppointmentPopulated} appt
 * @returns {Promise<{ qas: [string, string][], comment: string }?>}
 */
async function extractFeedbackBindings (appt) {
  const feedback = /** @type {*} */(appt)?.feedback
  if (!feedback) { return null }

  const qas = zip(
    feedback.questions ?? [],
    feedback.answers ?? []
  ).filter(([q, a]) => q && a)
  
  return { qas, comment: feedback.comment }
}

/**
 * @param {ShowingAppointmentPopulated} appt
 * @param {(string | undefined)=} [timezone=undefined]
 * @returns {string}
 */
function formatTime (appt, timezone = undefined) {
  assert.equal(typeof appt.showing.duration, 'number', 'Invalid duration')

  const m1 = moment(appt.time)
  timezone && m1.tz(timezone)
  
  const m2 = m1.clone().add(appt.showing.duration, 'seconds')
  
  if (!Number.isSafeInteger(appt.showing.duration) || !m2.isValid()) {
    return m1.format('dddd, MMMM D, H:mm A')
  }
  
  const part1 = m1.format('dddd, MMMM D, H:mm')  
  const part2 = m2.format(' - H:mm')
  
  const ampm1 = m1.format('A')
  const ampm2 = m2.format('A')

  return [
    part1,
    ampm1 === ampm2 ? '' : ` ${ampm1}`,
    part2,
    ` ${ampm2}`,
  ].join('')
}

/**
 * @param {ShowingAppointmentPopulated} appt
 * @returns {string | undefined}
 */
function buyerTimezone (appt) {
  if (!appt?.showing?.roles) { return undefined }
  const roles = appt.showing.roles.filter(r => r.user?.timezone)

  const sellerAgent = roles.find(r => r.role === 'SellerAgent')
  if (sellerAgent) { return sellerAgent.user.timezone }

  return roles?.[0]?.user?.timezone ?? undefined
}

module.exports = {
  extractListingBindings,
  extractSellerContactBindings,
  extractBuyerContactBindings,
  extractApprovalBindings,
  extractFeedbackBindings,
  toSquareFoot,
  findRole,
  staticMap,
  staticMapForProperty,
  shortLinkTo,
  shortApprovalLinkTo,
  formatTime,
  buyerTimezone,
}
