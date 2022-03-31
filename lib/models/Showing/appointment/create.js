const { expect } = require('chai')
const moment = require('moment-timezone')
const db = require('../../../utils/db')
const Showing = require('../showing/get')

const ContactLead = require('../../Contact/lead/save')
const Orm = {
  ...require('../../Orm/index'),
  ...require('../../Orm/context'),
}
const { dispatchEvent } = require('./status_fsm')

/**
 * @param {UUID} showing
 * @param {import("./types").ShowingAppointmentInput} appointment
 */
async function insert(showing, appointment) {
  return db.insert('showing/appointment/insert', [
    /* $1  */ appointment.source,
    /* $2  */ appointment.time,
    /* $3  */ showing,
    /* $4  */ appointment.contact,
    /* $5  */ appointment.status,
    /* $6  */ appointment.email,
    /* $7  */ appointment.phone_number,
    /* $8  */ appointment.first_name,
    /* $9  */ appointment.last_name,
    /* $10 */ appointment.company,
  ])
}

/**
 * @param {UUID} showing
 * @param {import('./types').ShowingAppointmentInput} appointment
 */
async function create(showing, appointment) {
  try {
    return await insert(showing, appointment)
  } catch (ex) {
    switch (ex.constraint) {
      case 'showings_appointments_showing_fkey':
        throw Error.ResourceNotFound('Provided showing does not exist')
      case 'showings_appointments_contact_fkey':
        throw Error.Validation('Provided contact does not exist')
      default:
        throw ex
    }
  }
}

/**
 * @param {import("../showing/types").ShowingPopulated} showing
 */
function findSellerAgent(showing) {
  const sellerAgent = showing.roles.find((r) => r.role === 'SellerAgent')
  if (!sellerAgent) {
    throw Error.Validation('Showing does not have a seller agent!')
  }

  return sellerAgent
}

/**
 * @param {import("../showing/types").ShowingPopulated} showing
 * @param {string} time
 */
function validateAppointmentRequest(showing, time) {
  if (!showing.aired_at) {
    throw Error.ResourceNotFound('Showing does not exist!')
  }

  const sellerAgent = findSellerAgent(showing)
  const timezone = sellerAgent.user.timezone ?? 'America/Chicago'
  const m_time = moment(time, moment.ISO_8601).tz(timezone)
  expect(m_time, `${time} resulted in an undefined moment object with time zone ${timezone}`).not.to.be.undefined

  if (m_time.isBefore(moment())) {
    throw Error.Validation('Cannot make an appointment in the past!')
  }

  if (
    !showing.availabilities.some((a) => {
      const m_low = m_time.clone().startOf('day').seconds(a.availability[0])
      const m_high = m_time.clone().startOf('day').seconds(a.availability[1])
      return m_time.format('dddd') === a.weekday && m_time.isBetween(m_low, m_high, 'seconds', '[]')
    })
  ) {
    throw Error.Validation('The requested time does not respect the availability rules of this showing!')
  }
}

/**
 * @param {UUID} showing_id
 * @param {import("./types").ShowingAppointmentRequestPayload} payload
 */
async function request(showing_id, payload) {
  const associations = ['showing.roles', 'showing.availabilities', 'showing_role.user']
  Orm.setEnabledAssociations(associations)
  const model = await Showing.get(showing_id)
  if (!model) {
    throw Error.ResourceNotFound('Showing does not exist!')
  }

  /** @type {[import("../showing/types").ShowingPopulated]} */
  const [showing] = await Orm.populate({
    models: [model],
    associations,
  })

  validateAppointmentRequest(showing, payload.time)

  const sellerAgent = findSellerAgent(showing)

  const contact = await (async () => {
    const found = await ContactLead.findContact(
      payload.contact.email,
      sellerAgent.user.id,
      showing.brand
    )
    if (found) { return found }

    const created = await ContactLead.saveContact(
      'JSON',
      payload.contact,
      'Showing',
      sellerAgent.user.id, // XXX: why not showing.created_by
      showing.brand
    )
    return created.contact
  })()

  const id = await create(showing.id, {
    contact: contact.id,
    source: payload.source,
    time: payload.time,
    status: 'Requested',
    email: payload.contact.email,
    phone_number: payload.contact.phone_number,
    first_name: payload.contact.first_name,
    last_name: payload.contact.last_name,
    company: payload.contact.company,
  })

  await dispatchEvent('Requested', id)

  return id
}

module.exports = {
  request,
}
