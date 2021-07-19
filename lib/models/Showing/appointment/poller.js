const { promisify } = require('util')
const { getAllRecentlyDone } = require('./get')
const { updateStatus } = require('./status_fsm')
const mailerFactory = require('./mailer-factory')
const Orm = require('../../Orm')
const Notification = {
  ...require('../../Notification/delivery'),
  ...require('../../Notification/get'),
}

const saveDeliveryPromise = promisify(Notification.saveDelivery)

const AN_HOUR = 60 * 60 * 1000

/** @typedef {require('../../../../types/models/Notification').INotificationPopulated} PopulatedNotification */
/** @typedef {require('../../../../types/models/Notification').INotification} Notification */

function passedMoreThan (millis, fromTime) {
  fromTime instanceof Date && (fromTime = fromTime.getTime())
  return Date.now() - fromTime >= millis 
}

async function finalizeRecentlyDone () {
  const recentlyDoneAppointments = await getAllRecentlyDone()

  /* TODO: At some point We're gonna need to remove this loop and replace it
   * with a single query. */
  for (const appt of recentlyDoneAppointments) {
    if (appt.status !== 'Completed') {
      const newStatus = appt.status === 'Confirmed' ? 'Completed' : 'Canceled'
      await updateStatus(appt.id, newStatus)
      continue
    }

    if (passedMoreThan(AN_HOUR, appt.time)) {
      /* TODO: somehow prevent duplicate get-feedback emails */

      const [populatedAppt] = await Orm.populate({
        models: [appt],
        associations: [
          'showing_appointment.contact',
          // surely, we need more associations to extract template bindings...
        ]
      })
      
      await mailerFactory.forGetFeedbackEmail(populatedAppt).send()
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
    const mailer = mailerFactory.forNotification(notif)
    if (!mailer) { continue }

    await mailer.send()
    
    for (const userId of mailer.toUserIds) {
      await saveDeliveryPromise(
        /* notification: */ notif.id,
        /* user: */ userId,
        /* token: */ null,
        /* type: */ 'email',        
      )
    }
  }
}

module.exports = { finalizeRecentlyDone, sendEmailNotification }
