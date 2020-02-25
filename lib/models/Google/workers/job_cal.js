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



const handleException = async (credential, msg, ex) => {
  Context.log('SyncGoogleCalendar handleException', msg, ex)

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    await GoogleCredential.disableEnableSync(credential.id, 'disable')
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Google-Calendar Job postponed`
  const emoji = ':bell:'

  // Slack.send({ channel: '7-server-errors',  text, emoji })
  Slack.send({ channel: 'integration_logs', text, emoji })

  return
}

const syncRechatToGoogle = async (credential, query) => {
  const user      = await User.get(credential.user)
  const calEvents = await filter(credential.brand, credential.user, query)
  const { created, updated, deleted } = await refineEvents(credential, calEvents, user.timezone)

  Context.log('SyncGoogleCalendar calEvents.length', calEvents.length)
  Context.log('SyncGoogleCalendar created.length', created.length)
  Context.log('SyncGoogleCalendar updated.length', updated.length)
  Context.log('SyncGoogleCalendar deleted.length', deleted.length)

  let error = null

  if ( !error && created.length !== 0 ) {
    const result = await handleCreatedEvents(credential, created.slice(0, 35))

    error = result.error
  }

  if ( !error && updated.length !== 0 ) {
    const result = await handleUpdatedEvents(credential, updated.slice(0, 3))

    error = result.error
  }

  if ( !error && deleted.length !== 0 ) {
    await handleDeletedEvents(credential, deleted)
  }

  return {
    error,
    firstEvent: calEvents[0]
  }
}

const syncGoogleToRechat = async (google, credential) => {
  if ( credential.scope_summary.includes('calendar') ) {
    if (credential.google_calendar) {

      const calendarResult = await calendarWorker.updateCalendarsWatcher(credential)
      if ( !calendarResult.status ) {
        const msg = 'Job Error - Google-Calendar Sync Failed [rechat-to-google calendars]'
        await handleException(credential, msg, calendarResult.ex)

        return false
      }

      Context.log('SyncGoogleCalendar - calendarResult', credential.id, credential.email, calendarResult)
  
      const calendarEventsResult = await calendarEventsWorker.syncCalendarEvents(google, credential)
      if ( !calendarEventsResult.status ) {
        const msg = 'Job Error - Google-Calendar Sync Failed [rechat-to-google events]'
        await handleException(credential, msg, calendarEventsResult.ex)

        return false
      }

      Context.log('SyncGoogleCalendar - calendarEventsResult', credential.id, credential.email, calendarEventsResult)
    }
  }

  return true
}


const syncCalendar = async (data) => {
  const credential = data.googleCredential

  const start_time       = new Date()
  const cal_last_sync_at = new Date(credential.calendars_last_sync_at)
  const last_updated_gt  = cal_last_sync_at.getTime() || null
  const query            = last_updated_gt ? { last_updated_gt } : {}

  const currentCredential = await GoogleCredential.get(credential.id)
  const duplicateCheck    = new Date(currentCredential.calendars_last_sync_at).getTime() !== cal_last_sync_at.getTime()

  if ( duplicateCheck || currentCredential.revoked || currentCredential.deleted_at ) {
    Slack.send({ channel: 'integration_logs', text: 'Google-Calendar Sync Job Is Skipped', emoji: ':skull:' })
    return
  }


  const google = await getGoogleClient(credential)

  if (!google) {
    Slack.send({ channel: 'integration_logs', text: 'Google-Calendar Sync Job Is Skipped, Client Is Failed', emoji: ':skull:' })
    return
  }


  if ( data.source === 'google' ) {
    Context.log('SyncGoogleCalendar - Start Job [Google To Rechat]', credential.id, credential.email)
  
    const status = await syncGoogleToRechat(google, credential)
    if (!status) {
      return
    }
  }


  if ( data.source === 'rechat' ) {
    Context.log('SyncGoogleCalendar - Start Job [Rechat To Google]', credential.id, credential.email)
    const { error, firstEvent } = await syncRechatToGoogle(credential, query)
  
  }
  
  const sync_duration = new Date().getTime() - start_time.getTime()


  // Update as Success
  if (!error) {
    const ts = firstEvent ? firstEvent.last_updated_at : start_time
    await GoogleCredential.updateCalendarsLastSyncAt(credential.id, ts)
    await UsersJobs.upsertByGoogleCredential(credential, 'calendar', 'success')
    Context.log(`SyncGoogleCalendar - Job Finished ${credential.id} - ${credential.email} - ${sync_duration}`)
    return
  }

  await UsersJobs.upsertByGoogleCredential(credential, 'calendar', 'failed')
  Context.log(`SyncGoogleCalendar - Job Finished With Failure ${credential.id} - ${credential.email} - ${sync_duration} - Err: ${error}`)

  return
}


module.exports = {
  syncCalendar
}