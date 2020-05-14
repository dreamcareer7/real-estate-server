const Context   = require('../../Context')
const Slack     = require('../../Slack')
const Socket    = require('../../Socket')
const User      = require('../../User')
const UsersJobs = require('../../UsersJob')
const MicrosoftCredential   = require('../credential')
const MicrosoftSubscription = require('../subscription')
const calendarWorkers       = require('./subscriptions/calendar')

const { getMGraphClient } = require('../plugin/client.js')
const { getEvents, retrieveEvents } = require('../../Calendar/feed')
const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./subscriptions/calendar/dispatcher')


const handleException = async (credential, msg, ex) => {
  Context.log('SyncMicrosoftCalendar handleException', msg, ex)

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    await MicrosoftCredential.disableSync(credential.id)
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Microsoft-Calendar Job postponed`
  const emoji = ':skull:'

  Slack.send({ channel: 'integration_logs', text, emoji })

  return
}

const reportFailure = async (credential, error) => {
  const emoji = ':skull:'
  const text  = `SyncMicrosoftCalendar - Job Finished With Failure ${credential.id} - ${credential.email} - Err: ${error}`

  Slack.send({ channel: 'integration_logs', text, emoji })
  Context.log(text)

  await UsersJobs.upsertByMicrosoftCredential(credential, 'calendar', 'failed')
  await MicrosoftCredential.updateCalendarsLastSyncAt(credential.id, new Date())

  return
}

const printLogs = (calEvents, created, updated, deleted) => {
  Context.log('SyncMicrosoftCalendar RechatToMicrosoft calEvents.length', calEvents.length)
  Context.log('SyncMicrosoftCalendar RechatToMicrosoft created.length', created.length)
  Context.log('SyncMicrosoftCalendar RechatToMicrosoft updated.length', updated.length)
  Context.log('SyncMicrosoftCalendar RechatToMicrosoft deleted.length', deleted.length)

  // Context.log('---- created', created)
  // Context.log('---- updated', updated)
  // Context.log('---- deleted', deleted)

  // const first = calEvents[0]
  // const last  = calEvents[calEvents.length - 1]

  // Context.log('SyncMicrosoftCalendar calEvents[first]', first.title, new Date(first.timestamp * 1000), new Date(first.last_updated_at))
  // Context.log('SyncMicrosoftCalendar calEvents[last]', last.title, new Date(last.timestamp * 1000), new Date(last.last_updated_at))

  // const _ = require('lodash')
  // const byObjectType = _.groupBy(calEvents, 'object_type')

  // for (const type of Object.keys(byObjectType)) {
  //   Context.log('SyncMicrosoftCalendar Type:', type, byObjectType[type].length)
  // }

  return
}

const syncMicrosoftToRechat = async (microsoft, credential) => {
  const user = await User.get(credential.user)

  const calendarResult = await calendarWorkers.calendars.HandleCalendars(microsoft, credential)
  if ( !calendarResult.status ) {
    const message = 'Job Error - Microsoft-Calendar Sync Failed [Microsoft To Rechat - calendars]'
    await handleException(credential, message, calendarResult.ex)

    return {
      error: `${message} - ${calendarResult.ex.message}`,
      status: false,
      upserteIds: [],
      deletedIds: []
    }
  }

  if ( calendarResult.status ) {
    if ( calendarResult.ex === 'rechat-primary-cal-is-deleted' ) {
      const message = 'Job Error - Microsoft-Calendar Sync Stopped [Microsoft To Rechat - calendars]'
      return {
        error: `${message} - ${calendarResult.ex}`,
        status: false,
        upserteIds: [],
        deletedIds: []
      } 
    }
  }

  Context.log('SyncMicrosoftCalendar - calendarResult', credential.id, credential.email, calendarResult)


  const calendarEventsResult = await calendarWorkers.events.syncCalendarEvents(microsoft, credential, user.timezone)

  const upserteIds = calendarEventsResult.upserteIds
  const deletedIds = calendarEventsResult.deletedIds

  if ( !calendarEventsResult.status ) {
    const message = 'Job Error - Microsoft-Calendar Sync Failed [Microsoft To Rechat - events]'
    await handleException(credential, message, calendarEventsResult.ex)

    return {
      error: `${message} - ${calendarEventsResult.ex.message}`,
      status: false,
      upserteIds,
      deletedIds
    }
  }

  Context.log('SyncMicrosoftCalendar - calendarEventsResult', credential.id, credential.email)


  return {
    error: null,
    status: true,
    upserteIds,
    deletedIds
  }
}

const syncRechatToMicrosoft = async (credential, query) => {
  const { user, calEvents } = await getEvents(credential, query)

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
  const credential = data.microsoftCredential

  Context.log('SyncMicrosoftCalendar - Job Started', credential.id, credential.email, credential.calendars_last_sync_at)

  if (!credential.scope_summary.includes('calendar') || !credential.microsoft_calendar) {
    Context.log('SyncMicrosoftCalendar - Job Skipped - No Rechat Claendar', credential.id, credential.email)
    await UsersJobs.upsertByMicrosoftCredential(credential, 'calendar', 'success')
    return
  }

  const start_time       = new Date()
  const cal_last_sync_at = credential.calendars_last_sync_at ? new Date(credential.calendars_last_sync_at) : new Date(0)
  const last_updated_gt  = cal_last_sync_at.getTime() / 1000

  const currentCredential = await MicrosoftCredential.get(credential.id)
  const duplicateCheck    = new Date(currentCredential.calendars_last_sync_at).getTime() !== cal_last_sync_at.getTime()

  if ( duplicateCheck || currentCredential.revoked || currentCredential.deleted_at ) {
    Slack.send({ channel: 'integration_logs', text: `Microsoft-Calendar Sync Job Is Skipped - ${credential.id}`, emoji: ':bell:' })
    await UsersJobs.upsertByMicrosoftCredential(credential, 'calendar', 'failed')
    return
  }


  const { microsoft } = await getMGraphClient(credential)

  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: `Microsoft-Calendar Sync Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJobs.upsertByMicrosoftCredential(credential, 'calendar', 'failed')
    return
  }


  let result = {}

  Context.log('SyncMicrosoftCalendar - [Microsoft To Rechat]', credential.id, credential.email)
  result = await syncMicrosoftToRechat(microsoft, credential)
  if (result.error) {
    await reportFailure(credential, result.error)
    return
  }
  Context.log('SyncMicrosoftCalendar - [Microsoft To Rechat] Done', credential.id, credential.email)

  const upsertedTaskIds = result.upserteIds
  const deletedTaskIds  = result.deletedIds


  Context.log('SyncMicrosoftCalendar - [Rechat To Microsoft]', credential.id, credential.email)
  result = await syncRechatToMicrosoft(credential, { last_updated_gt })
  if (result.error) {
    await reportFailure(credential, result.error)
    return
  }
  Context.log('SyncMicrosoftCalendar - [Rechat To Microsoft] Done', credential.id, credential.email)


  // Report success
  const sync_duration = new Date().getTime() - start_time.getTime()
  const ts = result.firstEvent ? new Date(result.firstEvent.last_updated_at).getTime() + 1 : new Date(start_time).getTime() + 1

  await MicrosoftCredential.updateCalendarsLastSyncAt(credential.id, new Date(ts))
  await UsersJobs.upsertByMicrosoftCredential(credential, 'calendar', 'success')

  if ( upsertedTaskIds.length || deletedTaskIds.length ) {
    const upserted = await retrieveEvents(credential, upsertedTaskIds)
    Socket.send('Calendar.Updated', credential.brand, [{ upserted, deleted: deletedTaskIds }])
  }

  Context.log(`SyncMicrosoftCalendar - Job Finished ${credential.id} - ${credential.email} - ${sync_duration} - ${last_updated_gt}`)
  return
}

const handleNotifications = async (data) => {
  try {
    const subscription = await MicrosoftSubscription.getByRemoteId(data.subscriptionId)

    if (!subscription) {
      return
    }

    const credential = await MicrosoftCredential.get(subscription.microsoft_credential)

    if ( credential.deleted_at || credential.revoked ) {
      return
    }

    if ( data.lifecycleEvent === 'subscriptionRemoved' ) {
      return await MicrosoftSubscription.delete(subscription.id)
    }

    await MicrosoftCredential.forceSyncCalendar(subscription.microsoft_credential)

  } catch (ex) {

    if ( ex.message === 'Please wait until current sync job is finished.' ) {
      return
    }

    // nothing to do
    if ( ex.statusCode === 429 ) {
      return
    }

    Context.log(`SyncMicrosoft - OutlookCalSub - Notifications process failed - subscription: ${data.subscriptionId} - Ex: ${ex}`)

    const text  = `SyncMicrosoft - Notifications process failed - subscription: ${data.subscriptionId} - Details: ${ex.message}`
    const emoji = ':skull:'

    Slack.send({ channel: 'integration_logs', text, emoji })

    return
  }
}


module.exports = {
  syncCalendar,
  handleNotifications
}