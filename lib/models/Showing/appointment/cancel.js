const db = require('../../../utils/db')
const { dispatchEvent } = require('./status_fsm')

/**
 * @param {UUID} appointment_id
 * @param {string} message
 */
async function setBuyerMessage(appointment_id, message) {
  return db.update('showing/appointment/set_message', [ appointment_id, message ])
}

/**
 * Cancel appointment by buyer
 * @param {UUID} appointment_id
 * @param {string} message
 */
async function cancel(appointment_id, message) { 
  await setBuyerMessage(appointment_id, message)
  await dispatchEvent('BuyerCanceled', appointment_id)
}

module.exports = {
  cancel,
}
