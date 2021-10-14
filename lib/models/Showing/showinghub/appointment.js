const { strict: assert } = require('assert')
const find = require('lodash/find')

const db = require('../../../utils/db')
const { peanar } = require('../../../utils/peanar')
const Orm = require('../../Orm/context')

const Agent = require('../../Agent/get')
const Appointment = require('../appointment/get')
const Context = require('../../Context')
const Showing = require('../showing/get')
const ShowableListing = require('./showable_listing')
const ShowingRole = require('../role/get')
const User = require('../../User/get')

const utils = require('./utils')
const { client } = require('./client')
const { CancellationReasonType, AppointmentType, AppointmentMethod } = require('./api')

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
 * @param {import('./types').AppointmentEntity} hubAppointment
 * @param {UUID} appointmentId
 */
async function insert(hubAppointment, appointmentId) {
  return db.query.promise('showing/hub/appointment/insert', [
    hubAppointment.id,
    hubAppointment.createdOn,
    hubAppointment.modifiedOn,
    hubAppointment.actualStartDatetime,
    hubAppointment.actualEndDatetime,
    hubAppointment.appointmentType,
    hubAppointment.appointmentMethod,
    hubAppointment.buyingAgentID,
    hubAppointment.buyingAgentName,
    hubAppointment.buyingAgentStateLicenseAffirmation,
    hubAppointment.buyingAgentLicenseNumber,
    hubAppointment.buyingAgentLicenseState,
    hubAppointment.buyingAgentMlsId,
    hubAppointment.appointmentStatus,
    appointmentId,
  ])
}

async function request(apptId) {
  Context.log(`HubAppointment.request('${apptId}')`)
  const hubApptId = await Appointment.get(apptId)
  if (hubApptId) {
    Context.log(
      `Warning: Already there is related Hub Appointment (${hubApptId}) fornewly requested Rechat Appointment (${apptId})`
    )
  }

  const appt = await Appointment.get(apptId)
  if (!appt) {
    Context.log(`No appointment was found with id '${apptId}'!`)
    return
  }

  Orm.enableAssociation('showing.roles')
  const showing = await Showing.get(appt.showing)
  if (!showing) {
    Context.log(`No appointment was found with id '${appt.showing}'!`)
    return
  }

  const hubShowingId = await ShowableListing.findByShowingId(showing.id)
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

  Context.log('Creating the appointment request on hub...')
  const res = await client.api.appRequestCreate({
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

  Context.log(`Create request was ${res.data.isSuccessful ? 'successful' : 'unsuccessfull!'}`)

  // XXX: do we need to create an appointment here?

  if (!utils.handleFailure(res?.data)) {
    return
  }

  const request = res.data?.results?.[0]
  assert(
    request?.requestId,
    `No Request [ID] returned after creating request for appointment ${apptId}`
  )

  if (request?.appointmentId) {
    const hubAppointmentResp = await client.api.appAppointmentDetail(request?.appointmentId)
    if (!hubAppointmentResp.data.isSuccessful || !hubAppointmentResp.data.results) {
      console.log(hubAppointmentResp.data.message)
      console.log(hubAppointmentResp.data.exceptions)
    } else {
      const hubAppointment = hubAppointmentResp.data.results[0]

      Context.log('Creating the HubAppointment entity in the database...')

      // TODO: cast to AppointmentEntity
      await insert(hubAppointment, apptId)
    }
  } else {
    Context.log('A strange case where a request was made without an appointment')
  }
}

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./types').ShowableListing[]>}
 */
function getAll(ids) {
  return db.select('showing/hub/appointment/get', [ids])
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
 * @param {UUID} appointment
 * @returns {Promise<UUID>}
 */
function findByAppointmentId(appointment) {
  return db.selectId('showing/hub/appointment/find_by_appointment', [appointment])
}

/**
 * @param {UUID} apptId 
 */
async function confirm(apptId) {
  Context.log(`HubAppointment.confirm('${apptId}')`)

  const hubApptId = await findByAppointmentId(apptId)
  assert(hubApptId, `No Hub Appointment found for Rechat Appointment ${apptId}`)

  Context.log('Confirming the appointment on the hub...')
  const resp = await client.api.appAppointmentConfirmUpdate(hubApptId)
  Context.log(`Confirm request was ${resp.data.isSuccessful ? 'successful' : 'unsuccessfull!'}`)

  utils.handleFailure(resp.data)

  const updated = resp.data.results?.[0]

  Context.log('Upserting the HubAppointment entity in the database...')
  await insert(updated, apptId)
}

/**
 * @param {UUID} apptId 
 */
async function reject(apptId) {
  Context.log(`HubAppointment.reject('${apptId}')`)
  const hubApptId = await findByAppointmentId(apptId)
  if (!hubApptId) {
    return Context.log(`No Hub Appointment found for Rechat Appointment ${apptId}`)
  }

  const appt = await Appointment.get(apptId)

  Context.log('Denying the appointment on the hub...')
  const resp = await client.api.appAppointmentDenyUpdate(hubApptId, {
    appointmentNotes: await utils.extractCancellationComment(appt),
  })
  Context.log(`Deny request was ${resp.data.isSuccessful ? 'successful' : 'unsuccessfull!'}`)

  utils.handleFailure(resp.data)

  const updated = resp.data.results?.[0]
  Context.log('Upserting the HubAppointment entity in the database...')
  await insert(updated, apptId)
}

/**
 * @param {UUID} apptId 
 */
async function cancel(apptId, reason = CancellationReasonType.Other) {
  Context.log(`HubAppointment.cancel('${apptId}')`)
  const hubApptId = await findByAppointmentId(apptId)
  if (!hubApptId) {
    return Context.log(`No Hub Appointment found for Rechat Appointment ${apptId}`)
  }

  const appt = await Appointment.get(apptId)

  const resp = await client.api.appAppointmentCancelUpdate(hubApptId, {
    cancelReason: reason,
    cancelComments: await utils.extractCancellationComment(appt),
  })

  utils.handleFailure(resp.data)

  const updated = resp.data.results?.[0]
  await insert(updated, apptId)
}

module.exports = {
  request: peanar.job({
    handler: request,
    name: 'showinghub/appointment.request',
    queue: 'showinghub',
    exchange: 'showinghub',
    error_exchange: 'showinghub.error',
    retry_exchange: 'showinghub.retry',
  }),
  confirm: peanar.job({
    handler: confirm,
    name: 'showinghub/appointment.confirm',
    queue: 'showinghub',
    exchange: 'showinghub',
    error_exchange: 'showinghub.error',
    retry_exchange: 'showinghub.retry',
  }),
  cancel: peanar.job({
    handler: cancel,
    name: 'showinghub/appointment.cancel',
    queue: 'showinghub',
    exchange: 'showinghub',
    error_exchange: 'showinghub.error',
    retry_exchange: 'showinghub.retry',
  }),
  reject: peanar.job({
    handler: reject,
    name: 'showinghub/appointment.reject',
    queue: 'showinghub',
    exchange: 'showinghub',
    error_exchange: 'showinghub.error',
    retry_exchange: 'showinghub.retry',
  }),

  get,
  getAll,
  findByAppointmentId,
  insert,
}
