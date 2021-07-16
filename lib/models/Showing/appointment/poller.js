const { getAllRecentlyDone } = require('../appointment/get')
const { updateStatus } = require('../appointment/status_fsm')
const Notification = require('../../Notification/get')
const mailerFactory = require('./mailer-factory')
const Orm = require('../../Orm')

async function finalizeRecentlyDone () {
  const results = await getAllRecentlyDone()

  /* TODO: At some point We're gonna need to remove this loop and replace it
   * with a single query. */
  for (const r of results) {
    const newStatus = r.status === 'Confirmed' ? 'Completed' : 'Canceled'    
    await updateStatus(r.id, newStatus)
  }
}

async function sendEmailNotification () {
  let unreadNotifs = await Notification.getUnreadOverTime({
    objectClass: 'ShowingAppointment',
  })

  unreadNotifs = await Orm.populate({
    models: unreadNotifs,
    associations: [
      'notification.subjects',
      'notification.objects',
      'showing_appointment.showing',
      'showing.roles',
      'showing_role.user',
    ]
  })
  
  if (!unreadNotifs?.length) { return }

  for (const notif of unreadNotifs) {
    const mailers = mailerFactory.forNotification(notif)
    if (!mailers?.length) { continue }

    await Promise.all(mailers.map(m => m.send()))
  }
}

module.exports = { finalizeRecentlyDone, sendEmailNotification }
