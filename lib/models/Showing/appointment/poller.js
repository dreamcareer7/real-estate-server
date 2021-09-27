const Context = require('../../Context')
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
    await Appointment.updateStatus('Finished', appt.id)
  }
}

async function sendEmailNotification () {
  const unreadNotifs = await Notification.getUnreadOverTime({
    objectClass: 'ShowingAppointment',
  })

  for (const unreadNotif of unreadNotifs) {
    await mailerFactory.forNotification(unreadNotif).then(m => m?.send())
  }
}

module.exports = { finalizeRecentlyDone, sendEmailNotification }
