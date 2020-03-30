const Orm = require('../../Orm')
const Context = require('../../Context')
const Slack   = require('../../Slack')

const User      = require('../../User')
const UsersJobs = require('../../UsersJob')
const GoogleCredential     = require('../credential')
const calendarWorker       = require('./calendars/calendar')
const calendarEventsWorker = require('./calendars/events')

const { getGoogleClient } = require('../plugin/client.js')
const { filter } = require('../../Calendar/feed')
const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./calendars/dispatcher')

const associations = ['calendar_event.full_crm_task', 'crm_task.associations', 'crm_task.assignees', 'crm_task.reminders', 'crm_association.contact']



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
  const emoji = ':skull:'

  Slack.send({ channel: 'integration_logs', text, emoji })

  return
}

const reportFailure = async (credential, error) => {
  const emoji = ':skull:'
  const text  = `SyncGoogleCalendar - Job Finished With Failure ${credential.id} - ${credential.email} - Err: ${error}`

  Slack.send({ channel: 'integration_logs', text, emoji })
  Context.log(text)

  await UsersJobs.upsertByGoogleCredential(credential, 'calendar', 'failed')
  await GoogleCredential.updateCalendarsLastSyncAt(credential.id, new Date())

  return
}

const printLogs = (calEvents, created, updated, deleted) => {
  Context.log('SyncGoogleCalendar RechatToGoogle calEvents.length', calEvents.length)
  Context.log('SyncGoogleCalendar RechatToGoogle created.length', created.length)
  Context.log('SyncGoogleCalendar RechatToGoogle updated.length', updated.length)
  Context.log('SyncGoogleCalendar RechatToGoogle deleted.length', deleted.length)

  // const first = calEvents[0]
  // const last  = calEvents[calEvents.length - 1]

  // Context.log('SyncGoogleCalendar calEvents[first]', first.title, new Date(first.timestamp * 1000), new Date(first.last_updated_at))
  // Context.log('SyncGoogleCalendar calEvents[last]', last.title, new Date(last.timestamp * 1000), new Date(last.last_updated_at))

  // const _ = require('lodash')
  // const byObjectType = _.groupBy(calEvents, 'object_type')

  // for (const type of Object.keys(byObjectType)) {
  //   Context.log('SyncGoogleCalendar Type:', type, byObjectType[type].length)
  // }

  return
}

const syncGoogleToRechat = async (google, credential) => {
  const calendarResult = await calendarWorker.updateCalendarsWatcher(credential)
  if ( !calendarResult.status ) {
    const message = 'Job Error - Google-Calendar Sync Failed [Google To Rechat - calendars]'
    await handleException(credential, message, calendarResult.ex)

    return {
      error: `${message} - ${calendarResult.ex.message}`,
      status: false
    }
  }

  if ( calendarResult.status ) {
    if ( calendarResult.ex === 'rechat-primary-cal-is-deleted' ) {
      const message = 'Job Error - Google-Calendar Sync Stopped [Google To Rechat - calendars]'
      return {
        error: `${message} - ${calendarResult.ex}`,
        status: false
      } 
    }
  }

  Context.log('SyncGoogleCalendar - calendarResult', credential.id, credential.email, calendarResult)


  const calendarEventsResult = await calendarEventsWorker.syncCalendarEvents(google, credential)
  if ( !calendarEventsResult.status ) {
    const message = 'Job Error - Google-Calendar Sync Failed [Google To Rechat - events]'
    await handleException(credential, message, calendarEventsResult.ex)

    return {
      error: `${message} - ${calendarEventsResult.ex.message}`,
      status: false
    }
  }

  Context.log('SyncGoogleCalendar - calendarEventsResult', credential.id, credential.email, calendarEventsResult)


  return {
    error: null,
    status: true
  }
}

const syncRechatToGoogle = async (credential, query) => {
  const user = await User.get(credential.user)
  Context.set({user})
  Orm.setEnabledAssociations(associations)

  const models    = await filter(credential.brand, credential.user, query)
  const calEvents = await Orm.populate({ models, associations })

  const firstEvent = calEvents[calEvents.length - 1] || null

  let error = null

  if ( calEvents.length === 0 ) {
    return {
      error,
      firstEvent
    }
  }

  const isInitialSync = credential.calendars_last_sync_at ? false : true

  const { created, updated, deleted } = await refineEvents(credential, calEvents, user.timezone, isInitialSync)

  printLogs(calEvents, created, updated, deleted)

  if ( !error && created.length !== 0 ) {
    const result = await handleCreatedEvents(credential, created)

    error = result.error
  }

  if ( !error && updated.length !== 0 ) {
    const result = await handleUpdatedEvents(credential, updated)

    error = result.error
  }

  if ( !error && deleted.length !== 0 ) {
    await handleDeletedEvents(credential, deleted)
  }


  return {
    error,
    firstEvent
  }
}

const syncCalendar = async (data) => {
  const credential = data.googleCredential

  Context.log('SyncGoogleCalendar - Job Started', credential.id, credential.email)

  if (!credential.scope_summary.includes('calendar') || !credential.google_calendar) {
    Context.log('SyncGoogleCalendar - Job Skipped - No Rechat Claendar', credential.id, credential.email)
    await UsersJobs.upsertByGoogleCredential(credential, 'calendar', 'success')
    return
  }

  const start_time       = new Date()
  const cal_last_sync_at = credential.calendars_last_sync_at ? new Date(credential.calendars_last_sync_at) : new Date(0)
  const last_updated_gt  = cal_last_sync_at.getTime() / 1000

  const currentCredential = await GoogleCredential.get(credential.id)
  const duplicateCheck    = new Date(currentCredential.calendars_last_sync_at).getTime() !== cal_last_sync_at.getTime()

  if ( duplicateCheck || currentCredential.revoked || currentCredential.deleted_at ) {
    Slack.send({ channel: 'integration_logs', text: 'Google-Calendar Sync Job Is Skipped', emoji: ':bell:' })
    await UsersJobs.upsertByGoogleCredential(credential, 'calendar', 'failed')
    return
  }


  const google = await getGoogleClient(credential)

  if (!google) {
    Slack.send({ channel: 'integration_logs', text: 'Google-Calendar Sync Job Is Skipped, Client Is Failed', emoji: ':skull:' })
    await UsersJobs.upsertByGoogleCredential(credential, 'calendar', 'failed')
    return
  }


  let result = {}

  Context.log('SyncGoogleCalendar - [Google To Rechat]', credential.id, credential.email)
  result = await syncGoogleToRechat(google, credential)
  if (result.error) {
    await reportFailure(credential, result.error)
    return
  }
  Context.log('SyncGoogleCalendar - [Google To Rechat] Done', credential.id, credential.email, ' - Result:', result)


  Context.log('SyncGoogleCalendar - [Rechat To Google]', credential.id, credential.email)
  result = await syncRechatToGoogle(credential, { last_updated_gt })
  if (result.error) {
    await reportFailure(credential, result.error)
    return
  }
  Context.log('SyncGoogleCalendar - [Rechat To Google] Done', credential.id, credential.email)


  // Report success
  const sync_duration = new Date().getTime() - start_time.getTime()
  const ts = result.firstEvent ? new Date(result.firstEvent.last_updated_at).getTime() + 1 : new Date(start_time).getTime() + 1

  await GoogleCredential.updateCalendarsLastSyncAt(credential.id, new Date(ts))
  await UsersJobs.upsertByGoogleCredential(credential, 'calendar', 'success')

  Context.log(`SyncGoogleCalendar - Job Finished ${credential.id} - ${credential.email} - ${sync_duration}`)
  return
}

const googleCalWebhook = async (data) => {

}


module.exports = {
  syncCalendar,
  googleCalWebhook
}