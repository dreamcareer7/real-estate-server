const Context = require('../../Context')
const Slack   = require('../../Slack')

const User      = require('../../User')
const UsersJobs = require('../../UsersJob')
const GoogleCredential = require('../credential')

const calendarWorker       = require('./calendars/calendar')
const calendarEventsWorker = require('./calendars/events')

const { getGoogleClient } = require('../plugin/client.js')
const { filter } = require('../../Calendar/feed')
const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./calendars/dispatcher')



const syncCalendar = async (data) => {
  const start_time       = new Date()
  const cal_last_sync_at = new Date(data.googleCredential.calendars_last_sync_at)
  const last_updated_gt  = cal_last_sync_at.getTime() || null
  const query            = last_updated_gt ? { last_updated_gt } : {}

  const currentCredential = await GoogleCredential.get(data.googleCredential.id)
  const duplicateCheck    = new Date(currentCredential.calendars_last_sync_at).getTime() !== cal_last_sync_at.getTime()

  if ( duplicateCheck || currentCredential.revoked || currentCredential.deleted_at ) {
    Slack.send({ channel: 'integration_logs', text: 'Google-Calendar Sync Job Is Skipped', emoji: ':skull:' })
    return
  }


  const google = await getGoogleClient(data.googleCredential)

  if (!google) {
    Slack.send({ channel: 'integration_logs', text: 'Google-Calendar Sync Job Is Skipped, Client Is Failed', emoji: ':skull:' })
    return
  }

  const handleException = async function(msg, ex) {
    Context.log('SyncGoogleCalendar handleException', msg, ex)

    if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
      await GoogleCredential.disableEnableSync(data.googleCredential.id, 'disable')
    }

    const obj = {
      id: data.googleCredential.id,
      email: data.googleCredential.email
    }

    const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Google-Calendar Job postponed`
    const emoji = ':bell:'

    // Slack.send({ channel: '7-server-errors',  text, emoji })
    Slack.send({ channel: 'integration_logs', text, emoji })

    return
  }



  Context.log('SyncGoogleCalendar - Start Job [Google To Rechat]', data.googleCredential.id, data.googleCredential.email)

  // Sync Calendar [Google to Rechat]
  if ( data.googleCredential.scope_summary.includes('calendar') ) {
    if (data.googleCredential.google_calendar) {

      const calendarResult = await calendarWorker.updateCalendarsWatcher(data)
      if ( !calendarResult.status ) {
        await handleException('Job Error - Google-Calendar Sync Failed [rechat-to-google calendars]', calendarResult.ex)
        return
      }
      Context.log('SyncGoogleCalendar - calendarResult', data.googleCredential.id, data.googleCredential.email, calendarResult)
  
      const calendarEventsResult = await calendarEventsWorker.syncCalendarEvents(google, data)
      if ( !calendarEventsResult.status ) {
        await handleException('Job Error - Google-Calendar Sync Failed [rechat-to-google events]', calendarEventsResult.ex)
        return
      }
      Context.log('SyncGoogleCalendar - calendarEventsResult', data.googleCredential.id, data.googleCredential.email, calendarEventsResult)
    }
  }

  const sync_duration_one = new Date().getTime() - start_time.getTime()



  Context.log('SyncGoogleCalendar - Start Job [Rechat To Google]', data.googleCredential.id, data.googleCredential.email)

  // Sync Calendar [Rechat to Google]
  const user      = await User.get(data.googleCredential.user)
  const calEvents = await filter(data.googleCredential.brand, data.googleCredential.user, query)
  const { created, updated, deleted } = await refineEvents(data.googleCredential, calEvents, user.timezone)


  Context.log('SyncGoogleCalendar calEvents.length', calEvents.length)
  // Context.log('SyncGoogleCalendar calEvents', calEvents[0])

  Context.log('SyncGoogleCalendar created.length', created.length)
  // Context.log('SyncGoogleCalendar created', created[0])

  Context.log('SyncGoogleCalendar updated.length', updated.length)
  // Context.log('SyncGoogleCalendar updated', updated[0])

  Context.log('SyncGoogleCalendar deleted.length', deleted.length)
  // Context.log('SyncGoogleCalendar deleted', deleted[0])


  let errorMsg = null

  if ( !errorMsg && created.length !== 0 ) {
    const { error } = await handleCreatedEvents(data.googleCredential, created.slice(0, 35))

    errorMsg = error
  }

  if ( !errorMsg && updated.length !== 0 ) {
    const { error } = await handleUpdatedEvents(data.googleCredential, updated.slice(0, 3))

    errorMsg = error
  }

  if ( !errorMsg && deleted.length !== 0 ) {
    await handleDeletedEvents(data.googleCredential, deleted)
  }

  const sync_duration_two = new Date().getTime() - start_time.getTime()
  const sync_duration     = sync_duration_one + sync_duration_two


  // Update as Success
  if (!errorMsg) {
    const newestCalEventTS = calEvents[0] ? calEvents[0].last_updated_at : null

    if (newestCalEventTS) {
      await GoogleCredential.updateCalendarsLastSyncAt(data.googleCredential.id, newestCalEventTS)
    }

    await UsersJobs.upsertByGoogleCredential(data.googleCredential, 'calendar', 'success')

    const message = `SyncGoogleCalendar - Job Finished ${data.googleCredential.id} - ${data.googleCredential.email} - ${sync_duration}`
    Context.log(message)

    return
  }

  await UsersJobs.upsertByGoogleCredential(data.googleCredential, 'calendar', 'failed')

  const message = `SyncGoogleCalendar - Job Finished With Failure ${data.googleCredential.id} - ${data.googleCredential.email} - ${sync_duration} - Err: ${errorMsg}`
  Context.log(message)

  return
}


module.exports = {
  syncCalendar
}