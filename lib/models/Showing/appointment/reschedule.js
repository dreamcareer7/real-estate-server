const db = require('../../../utils/db')

const { sendRescheduleNotificationToRoles } = require('./notification')
const { updateStatus } = require('./status_fsm')
const Appointment = require('./get')
const mailerFactory = require('./mailer-factory')

/**
 * @param {UUID} id
 * @param {string} newTime
 * @param {string} message
 */
async function updateTime(id, newTime, message) {
  return db.update('showing/appointment/reschedule', [id, newTime, message])
}

/**
 * Reschedule an appointment by buyer.
 * @param {UUID} appointment_id
 * @param {string} newTime
 * @param {string} message
 */
async function reschedule(appointment_id, newTime, message) {
  await updateStatus(appointment_id, 'Buyer', 'Rescheduled')
  await updateTime(appointment_id, newTime, message)

  // Buyer agent has rescheduled the showing
  await sendRescheduleNotificationToRoles(appointment_id, message)

  const appointment = await Appointment.get(appointment_id)
  await mailerFactory.forRescheduledAppointment(appointment).then(m => m?.send())

  // FIXME: send a new acknowledgement notification to buyer with cancel/reschedule links
}

module.exports = {
  reschedule,
}
