const Context = require('../../../Context')
// const CrmTask = require('../../../CRM/Task/index')
// const GoogleCalendarEvent = require('../../calendar_events')
const GoogleCalendar = require('../../calendar')


const getToSyncCalendars = async function (gcid) {
  const calendars = await GoogleCalendar.getAllByGoogleCredential(gcid)

  const toSync = calendars.filter(cal => cal.watcher_status !== 'stopped')

  return toSync
}

const deleteCalendars = async (credential, deletedCalendarIds) => {
  // const google_event_ids = await GoogleCalendarEvent.getByCalendarIds(credential.id, deletedCalendarIds)

  // do some logic here

  // await CrmTask.remove(ids, credential.user)
}

const updateCalendarsWatcher = async (credential) => {
  try {

    const toSyncLocalCalendars    = await getToSyncCalendars(credential.id)
    const toSyncRemoteCalendarIds = toSyncLocalCalendars.map(record => record.calendar_id)

    // It is possibe that some of the remote calendars are deleted
    // So we call persistRemoteCalendars to update offline calendars and exclude deleted ones.
    const result          = await GoogleCalendar.persistRemoteCalendars(credential.id, toSyncRemoteCalendarIds)
    const activeCalendars = await GoogleCalendar.getAll(result.activeCalendarIds)

    await deleteCalendars(credential, result.deletedCalendarIds)

    /*
      Currently there is no automatic way to renew a notification channel. When a channel is close to its expiration,
      you must create a new one by calling the watch method. As always, you must use a unique value for the id property of the new channel.
      Note that there is likely to be an "overlap" period of time when the two notification channels for the same resource are active.
    */

    for (const calendar of activeCalendars) {

      if (calendar.watcher) {
        const unixTS   = new Date().getTime()
        const expireIn = Number(calendar.watcher.expiration)
        const timeGap  = 30 * 60 * 1000 // 30 minutes
      
        if ( (expireIn - unixTS) < timeGap ) {
          Context.log('SyncGoogle - renew calendar watcher', calendar.google_credential, calendar.id)
          await GoogleCalendar.watchCalendar(calendar)
        }

      } else {

        Context.log('SyncGoogle - new calendar watcher', credential.id, calendar.id)
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