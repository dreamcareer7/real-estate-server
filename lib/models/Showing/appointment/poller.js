const { promisify } = require('util')
const { getAllRecentlyDone } = require('../get')
const { updateStatus } = require('../status_fsm')
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
  const results = await getAllRecentlyDone()

  /* TODO: At some point We're gonna need to remove this loop and replace it
   * with a single query. */
  for (const r of results) {
    if (r.status !== 'Completed') {
      const newStatus = r.status === 'Confirmed' ? 'Completed' : 'Canceled'    
      await updateStatus(r.id, newStatus)
      continue
    }

    if (passedMoreThan(AN_HOUR, r.time)) {
      // TODO: send get-feedback email if not sent yet
    }
  }
}

async function sendEmailNotification () {
  /** @type {Notification} */
  const unreadNotifsUnpopulated = await Notification.getUnreadOverTime({
    objectClass: 'ShowingAppointment',
  })

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
  
  if (!unreadNotifs?.length) { return }

  for (const notif of unreadNotifs) {
    const mailers = mailerFactory.forNotification(notif)
    if (!mailers?.length) { continue }

    await Promise.all(mailers.map(m => m.send()))

    /* Let's choose a user ID for the delivery
     * TODO: Do we need N deliveries when we send N emails?
     * TODO: How to choose user ID for the delivery record? */
    const userId = notif.objects?.[0]?.showing?.roles?.[0]?.user_id

    if (userId) {
      await saveDeliveryPromise(
        /* notification: */ notif.id,
        /* user: */ null,
        /* token: */ null,
        /* type: */ 'email',
      )      
    }
  }
}

module.exports = { finalizeRecentlyDone, sendEmailNotification }
