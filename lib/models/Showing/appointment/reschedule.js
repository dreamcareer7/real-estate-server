const db = require('../../../utils/db')
const { dispatchEvent } = require('./status_fsm')
const ShowingHub = require('../showinghub/events')

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
  await updateTime(appointment_id, newTime, message)
  await dispatchEvent('Rescheduled', appointment_id)
  await ShowingHub.emit.appointmentRescheduled(appointment_id)
}

module.exports = {
  reschedule,
}
