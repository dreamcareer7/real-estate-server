const Context = require('../../../Context')
const GoogleCalendar = require('../../calendar')
const { getToSyncCalendars } = require('./common')


const updateCalendarsWatcher = async (data) => {
  try {

    Context.log('updateCalendarsWatcher', data.googleCredential.id)

    const toSyncLocalCalendars    = await getToSyncCalendars(data.googleCredential.id)
    const toSyncRemoteCalendarIds = toSyncLocalCalendars.map(record => record.calendar_id)

    // It is possibe that some of the remote calendars are deleted
    // So we call persistRemoteCalendars to update offline calendars and exclude deleted ones.
    const calendarIds = await GoogleCalendar.persistRemoteCalendars(data.googleCredential.id, toSyncRemoteCalendarIds)
    const calendars   = await GoogleCalendar.getAll(calendarIds)

    Context.log('updateCalendarsWatcher - calendars', calendars)

    /*
      Currently there is no automatic way to renew a notification channel. When a channel is close to its expiration,
      you must create a new one by calling the watch method. As always, you must use a unique value for the id property of the new channel.
      Note that there is likely to be an "overlap" period of time when the two notification channels for the same resource are active.
    */

    for (const calendar of calendars) {

      if (calendar.watcher) {
        const unixTS   = new Date().getTime() / 1000
        const expireIn = calendar.watcher.expiration / 1000
        const timeGap  = 60 * 60 // 60 minutes
      
        if ( (expireIn - unixTS) > timeGap ) {
          Context.log('updateCalendarsWatcher renew watcher', calendar.id)
          await GoogleCalendar.watch(calendar.id)
        } else {
          Context.log('updateCalendarsWatcher skip watcher', calendar.id)
        }

      } else {

        Context.log('updateCalendarsWatcher new watcher', calendar.id)
        await GoogleCalendar.watch(calendar.id)
      }
    }

    return  {
      status: true,
      ex: null
    }

  } catch (ex) {

    Context.log('updateCalendarsWatcher, ex', ex)

    return  {
      status: false,
      ex: ex
    }
  }
}


module.exports = {
  updateCalendarsWatcher
}