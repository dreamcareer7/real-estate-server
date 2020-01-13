const Context = require('../../../Context')
const GoogleCalendar = require('../../calendar')
const { getToSyncCalendars } = require('./common')


const updateCalendarsWatcher = async (data) => {
  try {

    const toSyncLocalCalendars    = await getToSyncCalendars(data.googleCredential.id)
    const toSyncRemoteCalendarIds = toSyncLocalCalendars.map(record => record.calendar_id)

    // It is possibe that some of the remote calendars are deleted
    // So we call persistRemoteCalendars to update offline calendars and exclude deleted ones.
    const calendarIds = await GoogleCalendar.persistRemoteCalendars(data.googleCredential.id, toSyncRemoteCalendarIds)
    const calendars   = await GoogleCalendar.getAll(calendarIds)

    /*
      Currently there is no automatic way to renew a notification channel. When a channel is close to its expiration,
      you must create a new one by calling the watch method. As always, you must use a unique value for the id property of the new channel.
      Note that there is likely to be an "overlap" period of time when the two notification channels for the same resource are active.
    */

    for (const calendar of calendars) {

      if (calendar.watcher) {
        const unixTS   = new Date().getTime()
        const expireIn = Number(calendar.watcher.expiration)
        const timeGap  = 30 * 60 * 1000 // 30 minutes
      
        if ( (expireIn - unixTS) < timeGap ) {
          Context.log('SyncGoogle - renew watcher', calendar.google_credential, calendar.id)
          await GoogleCalendar.watchCalendar(calendar)

        } else {
          Context.log('SyncGoogle - skipt renewing watcher', calendar.google_credential, calendar.id)
        }

      } else {

        Context.log('SyncGoogle - new watcher', data.googleCredential.id, calendar.id)
        await GoogleCalendar.watchCalendar(calendar)
      }
    }

    return  {
      status: true,
      ex: null
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}


module.exports = {
  updateCalendarsWatcher
}