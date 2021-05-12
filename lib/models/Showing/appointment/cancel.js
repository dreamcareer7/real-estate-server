const { sendCancelNotificationToRoles, sendAppointmentCancelReceiptToBuyer } = require('./notification')
const { updateStatus } = require('./status_fsm')

/**
 * Cancel appointment by buyer
 * @param {UUID} appointment_id
 * @param {string} message
 */
async function cancel(appointment_id, message) {
  await updateStatus(appointment_id, 'Canceled')
  await sendCancelNotificationToRoles(appointment_id, message)
  await sendAppointmentCancelReceiptToBuyer(appointment_id)
}

module.exports = {
  cancel,
}
