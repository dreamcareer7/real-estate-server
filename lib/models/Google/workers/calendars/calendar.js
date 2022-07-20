const config  = require('../../../../config')
const Context = require('../../../Context')
const CrmTask = require('../../../CRM/Task/index')
const CalendarIntegration = require('../../../CalendarIntegration')
const GoogleCalendarEvent = require('../../calendar_events')
const GoogleCalendar      = require('../../calendar')

const getToSyncCalendars = require('./helpers/toSync')

const _REASON = config.google_integration.crm_task_update_reason



const deleteLocalCalendar = async (cal) => {
  await GoogleCalendar.deleteLocalByRemoteCalendarId(cal)
  await GoogleCalendarEvent.deleteLocalByCalendar(cal)
}

const handleDeleteCalendars = async (credential, deletedCalendars) => {
  if (deletedCalendars.length === 0) {
    return
  }

  const promises = deletedCalendars.filter(cal => (cal.id !== credential.google_calendar)).map(cal => deleteLocalCalendar(cal))
  await Promise.all(promises)

  const deletedIds = deletedCalendars.filter(cal => (cal.id !== credential.google_calendar)).map(cal => cal.id)
  const geventIds  = await GoogleCalendarEvent.getByCalendarIds(credential.id, deletedIds)
  const records    = await CalendarIntegration.getByGoogleIds(geventIds)

  const recordIds  = records.filter(r => r.crm_task).map(r => r.id)
  await CalendarIntegration.deleteMany(recordIds)

  const crmTaskIds = records.filter(r => r.crm_task).map(r => r.crm_task)
  await CrmTask.remove(crmTaskIds, credential.user, _REASON)
}

const updateCalendarsWatcher = async (credential) => {
  try {
    const toSyncLocalCalendars    = await getToSyncCalendars(credential.id)
    const toSyncRemoteCalendarIds = toSyncLocalCalendars.map(record => record.calendar_id)

    // It is possibe that some of the remote calendars are deleted
    // So we call persistRemoteCalendars to update offline calendars and exclude deleted ones.
    const result          = await GoogleCalendar.persistRemoteCalendars(credential, toSyncRemoteCalendarIds)
    const activeCalendars = await GoogleCalendar.getAll(result.activeCalendarIds)

    // Handle deletion of other-calendars (all of theses google-calendars contains only crm_task events)
    await handleDeleteCalendars(credential, result.deletedCalendars)

    const temp = result.deletedCalendars.filter(cal => (cal.id === credential.google_calendar))

    // Rechat primary calendar is deleted
    if (temp.length === 1) {
      return  {
        status: true,
        ex: 'rechat-primary-cal-is-deleted'
      }
    }


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
  updateCalendarsWatcher,
  deleteLocalCalendars: handleDeleteCalendars
}
