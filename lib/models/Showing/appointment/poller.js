const mailerFactory = require('./mailer-factory')
const Notification = {
  ...require('../../Notification/delivery'),
  ...require('../../Notification/get'),
}
const Appointment = {
  ...require('./get'),
  ...require('./update'),
  ...require('./status_fsm'),
}

const AN_HOUR = 60 * 60 * 1000

/** @typedef {import('../appointment/types').ShowingAppointment} ShowingAppointment */

/**
 * @param {number} millis
 * @param {Date | number} since
 * @returns {boolean}
 */
function passedMoreThan (millis, since) {
  since instanceof Date && (since = since.getTime())
  return Date.now() - since >= millis
}

async function finalizeRecentlyDone () {
  /** @type {ShowingAppointment[]} */
  const recentlyDoneAppointments = await Appointment.getAllRecentlyDone()

  /* TODO: At some point We're gonna need to remove this loop and replace it
   * with a single query. */
  for (const appt of recentlyDoneAppointments) {
    if (appt.status !== 'Completed') {
      const newStatus = appt.status === 'Confirmed' ? 'Completed' : 'Canceled'
      await Appointment.updateStatus(appt.id, newStatus)
    } else if (!appt.feedback_email && passedMoreThan(AN_HOUR, appt.time)) {
      const mailer = await mailerFactory.forGetFeedbackEmail(appt)
      if (!mailer) { continue }

      const email = await mailer.send()
      await Appointment.updateFeedbackEmail(appt.id, email.id)
    }
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
