const { strict: assert } = require('assert')

const Context = require('../../Context')
const ShowableListing = require('./showable_listing')

const Appointment = {
  ...require('../appointment/get'),
  ...require('../appointment/create'),
  ...require('../appointment/status_fsm'),
}

const HubAppointment = require('./appointment')

const utils = require('./utils')

async function AppointmentRequested(_, { data }) {
  if (!Array.isArray(data?.appointments) || !data.appointments.length) {
    return
  }

  const hubShowingId = data?.showListingId
  if (!hubShowingId) {
    throw Error.Validation('Missing Show Listing ID')
  } 

  const { showing: showingId } = await ShowableListing.get(hubShowingId)
  assert(showingId, `No related showing found for Hub Showing ${hubShowingId}`)

  for (const ha of data.appointments) {
    const contact = await utils.buyerAgentContactInfo(ha)
    const dt = ha.actualStartDatetime || data.actualStartDatetime || data.startDatetime

    const isoDate = new Date(dt).toISOString()

    const apptId = await Appointment.request(showingId, {
      source: 'ShowingHub',
      time: isoDate,
      contact,
    })

    // TODO: handle auto-approve
    await HubAppointment.insert(ha, apptId)
  }
}

/**
 * @param {UUID} appId 
 * @param {import('./types').WebhookPayload<any>} payload 
 */
async function handle(appId, payload) {
  const event = payload?.webhookEvent ?? null

  if (!appId && payload.applicationId) {
    appId = payload.applicationId
  }

  if (event === 'AppointmentRequested') {
    return AppointmentRequested(appId, payload)
  }
}

module.exports = {
  handle,
}
