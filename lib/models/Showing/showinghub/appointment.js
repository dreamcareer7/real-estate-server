const { strict: assert } = require('assert')
const find = require('lodash/find')

const config = require('../../../config')
const db = require('../../../utils/db')
const { peanar } = require('../../../utils/peanar')

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

async function insert() {}

async function request(apptId) {
  const hubApptId = await Appointment.get(apptId)
  if (hubApptId) {
    Context.log(
      `Warning: Already there is related Hub Appointment (${hubApptId}) fornewly requested Rechat Appointment (${apptId})`
    )
  }

  const appt = await Appointment.get(apptId)
  if (!appt) {
    return
  }

  const showing = await Showing.get(appt.showing)
  if (!showing) {
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

  /** @type {RequestResult} */
  const res = any(
    await client.api.appRequestCreate({
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
  )

  // XXX: do we need to create an appointment here?

  if (!utils.handleFailure(res)) {
    return
  }

  const request = res?.results?.[0]
  assert(
    request?.requestId,
    `No Request [ID] returned after creating request for appointment ${apptId}`
  )

  await dao.relateToRequest(apptId, request.requestId)
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
}
