const mailerFactory = require('./mailer-factory')
const Notification = {
  ...require('../../Notification/delivery'),
  ...require('../../Notification/get'),
}
const Appointment = {
  ...require('./get'),
  ...require('./status_fsm'),
}

async function finalizeRecentlyDone () {
  const recentlyDoneAppointments = await Appointment.getRecentlyDone()

  /* TODO: At some point We're gonna need to remove this loop and replace it
   * with a single query. */
  for (const appt of recentlyDoneAppointments) {
    await Appointment.dispatchEvent('Finished', appt.id)
  }
}

async function sendEmailNotification () {
  const unreadNotifs = await Notification.getNonDelivered({
    transport: 'email',
    objectClass: 'ShowingAppointment',
  })

  for (const unreadNotif of unreadNotifs) {
    const mailer = await mailerFactory.forNotification(unreadNotif)
    if (mailer) { await mailer.send() }
  }
}

module.exports = { finalizeRecentlyDone, sendEmailNotification }
