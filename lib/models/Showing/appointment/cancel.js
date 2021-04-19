const db = require('../../../utils/db')

const { sendCancelNotificationToRoles } = require('./notification')

/**
 * @param {UUID} id
 */
async function patchStatus(id) {
  return db.update('showing/appointment/update_status', [id, 'Canceled'])
}

/**
 * @param {UUID} appointment_id
 * @param {string} message
 */
async function cancel(appointment_id, message) {
  const updatedCount = await patchStatus(appointment_id)
  if (updatedCount !== 1) {
    throw Error.Validation('Cannot cancel an already concluded appointment.')
  }

  // Buyer agent has cancelled the showing
  await sendCancelNotificationToRoles(appointment_id, message)
}

module.exports = {
  cancel,
}
