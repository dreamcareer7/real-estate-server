const db = require("../../../utils/db")

/**
 * @param {UUID} id 
 */
async function patchStatus(id) {
  return db.update('showing/appointment/cancel', [ id ])
}

/**
 * @param {import('./types').ShowingAppointment} appointment
 */
async function cancel(appointment) {
  /** @type {import('./types').AppointmentStatus[]} */
  const invalidStatusesForCancel = [
    'Finished',
    'Cancelled'
  ]
  if (invalidStatusesForCancel.includes(appointment.status)) {
    throw Error.Validation('Cannot cancel an already concluded appointment.');
  }

  await patchStatus(appointment.id)

  // FIXME: Send a `ContactCancelledShowingAppointment` notification
}

module.exports = {
  cancel,
}
