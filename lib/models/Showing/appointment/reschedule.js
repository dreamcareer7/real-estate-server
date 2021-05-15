const db = require('../../../utils/db')

const { sendRescheduleNotificationToRoles } = require('./notification')
const { updateStatus } = require('./status_fsm')

/**
 * @param {UUID} id
 * @param {string} newTime
 */
async function updateTime(id, newTime) {
  return db.update('showing/appointment/reschedule', [id, newTime])
}

/**
 * Reschedule an appointment by buyer.
 * @param {UUID} appointment_id
 * @param {string} newTime
 * @param {string} message
 */
async function reschedule(appointment_id, newTime, message) {
  await updateStatus(appointment_id, 'Rescheduled')
  await updateTime(appointment_id, newTime)

  // Buyer agent has rescheduled the showing
  await sendRescheduleNotificationToRoles(appointment_id, message)

  // FIXME: send a new acknowledgement notification to buyer with cancel/reschedule links
}

module.exports = {
  reschedule,
}
