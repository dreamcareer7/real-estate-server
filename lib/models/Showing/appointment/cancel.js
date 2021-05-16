const db = require('../../../utils/db')
const { sendCancelNotificationToRoles, sendAppointmentCancelReceiptToBuyer } = require('./notification')
const { updateStatus } = require('./status_fsm')

async function setBuyerMessage(appointment_id, message) {
  return db.update('showing/appointment/set_message', [ appointment_id, message ])
}

/**
 * Cancel appointment by buyer
 * @param {UUID} appointment_id
 * @param {string} message
 */
async function cancel(appointment_id, message) {
  await updateStatus(appointment_id, 'Canceled')
  await setBuyerMessage(appointment_id, message)
  await sendCancelNotificationToRoles(appointment_id, message)
  await sendAppointmentCancelReceiptToBuyer(appointment_id)
}

module.exports = {
  cancel,
}
