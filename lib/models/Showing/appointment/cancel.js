const { sendCancelNotificationToRoles } = require('./notification')
const { updateStatus } = require('./status_fsm')

/**
 * @param {UUID} appointment_id
 * @param {string} message
 */
async function cancel(appointment_id, message) {
  await updateStatus(appointment_id, 'Canceled')
  await sendCancelNotificationToRoles(appointment_id, message)
}

module.exports = {
  cancel,
}
