const mailerFactory = require('./mailer-factory')
const Orm = require('../../Orm')
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
      continue
    }

    if (!appt.feedback_email_sent && passedMoreThan(AN_HOUR, appt.time)) {
      const [populatedAppt] = await Orm.populate({
        models: [appt],
        associations: [
          'showing_appointment.contact',
          // surely, we need more associations to extract template bindings...
        ]
      })

      await mailerFactory.forGetFeedbackEmail(populatedAppt).then(m => m?.send())
      await Appointment.updateFeedbackEmailSent(appt.id, true)
    }
  }
}

async function sendEmailNotification () {
  /** @type {Notification} */
  const unreadNotifsUnpopulated = await Notification.getUnreadOverTime({
    objectClass: 'ShowingAppointment',
  })

  if (!unreadNotifsUnpopulated?.length) { return }

  /** @type {PopulatedNotification} */
  const unreadNotifs = await Orm.populate({
    models: unreadNotifsUnpopulated,
    associations: [
      'notification.subjects',
      'notification.objects',
      'showing_appointment.showing',
      'showing_appointment.contact',
      'showing.roles',
      'showing_role.user',
    ]
  })
  
  for (const notif of unreadNotifs) {
    await mailerFactory.forNotification(notif).then(m => m?.send())
  }
}

module.exports = { finalizeRecentlyDone, sendEmailNotification }
