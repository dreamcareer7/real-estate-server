const db = require('../../../utils/db')
const { sendCancelNotificationToRoles, sendAppointmentCancelReceiptToBuyer } = require('./notification')
const { dispatchEvent } = require('./status_fsm')

async function setBuyerMessage(appointment_id, message) {
  return db.update('showing/appointment/set_message', [ appointment_id, message ])
}

/**
 * Cancel appointment by buyer
 * @param {UUID} appointment_id
 * @param {string} message
 */
async function cancel(appointment_id, message) {
  await dispatchEvent('BuyerCanceled', appointment_id)
  await setBuyerMessage(appointment_id, message)

  // TODO: handle these notifications using dispatchEvent:
  await sendCancelNotificationToRoles(appointment_id, message)
  await sendAppointmentCancelReceiptToBuyer(appointment_id)
}

module.exports = {
  cancel,
}
