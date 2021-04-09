const moment = require('moment')
const db = require('../../../utils/db')
const Showing = require('../showing/get')

const ContactLead = require('../../Contact/lead/save')
const Orm = {
  ...require('../../Orm/index'),
  ...require('../../Orm/context'),
}

/**
 * @param {UUID} showing
 * @param {import("./types").ShowingAppointmentInput} appointment
 */
async function insert(showing, appointment) {
  return db.insert('showing/appointment/insert', [
    /* $1 */ appointment.source,
    /* $2 */ appointment.time,
    /* $3 */ showing,
    /* $4 */ appointment.contact,
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
async function findSellerAgent(showing) {
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

  const m_time = moment(new Date(time).getTime())

  if (
    !showing.availabilities.some((a) => {
      const m_low = m_time.clone().startOf('day').seconds(a.availability[0])
      const m_high = m_time.clone().startOf('day').seconds(a.availability[1])
      return m_time.format('dddd') === a.weekday && m_time.isBetween(m_low, m_high, 'seconds')
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
  Orm.setEnabledAssociations(['showing.roles', 'showing.availabilities'])
  const model = await Showing.get(showing_id)
  if (!model) {
    throw Error.ResourceNotFound('Showing does not exist!')
  }

  /** @type {[import("../showing/types").ShowingPopulated]} */
  const [showing] = await Orm.populate({
    models: [model],
    associations: ['showing.roles', 'showing.availabilities'],
  })

  validateAppointmentRequest(showing, payload.time)

  const sellerAgent = await findSellerAgent(showing)
  const { contact } = await ContactLead.saveContact('JSON', payload.contact, 'Showing', sellerAgent.user, showing.brand)

  const id = await create(showing.id, {
    contact: contact.id,
    source: payload.source,
    time: payload.time,
  })

  // FIXME: Send a `ContactRequestedShowingAppointment` notification

  return id
}

module.exports = {
  request,
}
