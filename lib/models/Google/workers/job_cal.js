const Context  = require('../../Context')
const Slack    = require('../../Slack')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob')

const GoogleCredential     = require('../credential')
const GoogleCalendar       = require('../calendar')
const calendarWorker       = require('./calendars/calendar')
const calendarEventsWorker = require('./calendars/events')

const { getGoogleClient } = require('../plugin/client.js')
const { getEvents, retrieveEvents } = require('../../Calendar/feed')
const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./calendars/dispatcher')

const publisher = require('./publisher')



const handleException = async (credential, msg, ex) => {
  Context.log('SyncGoogleCalendar HandleException', msg, ex)

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    await GoogleCredential.disconnect(credential.id)
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Google-Calendar Job postponed`
  const emoji = ':skull:'

  Slack.send({ channel: 'integration_logs', text, emoji })

  await UsersJob.upsertByGoogleCredential(credential, 'calendar', 'pending')

  return
}

const reportFailure = async (credential, error) => {
  const emoji = ':skull:'
  const text  = `SyncGoogleCalendar - Job Finished With Failure ${credential.id} - ${credential.email} - Err: ${error}`

  Slack.send({ channel: 'integration_logs', text, emoji })
  Context.log(text)

  await UsersJob.upsertByGoogleCredential(credential, 'calendar', 'failed')

  return
}

const printLogs = (calEvents, created, updated, deleted) => {
  Context.log('SyncGoogleCalendar RechatToGoogle CalEvents Length', calEvents.length)
  Context.log('SyncGoogleCalendar RechatToGoogle Created Length', created.length)
  Context.log('SyncGoogleCalendar RechatToGoogle Updated Length', updated.length)
  Context.log('SyncGoogleCalendar RechatToGoogle Deleted Length', deleted.length)

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
    const message = 'Job Error - SyncGoogleCalendar Failed [Google To Rechat - calendars]'
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
      const message = 'Job Error - SyncGoogleCalendar Stopped [Google To Rechat - calendars]'
      return {
        error: `${message} - ${calendarResult.ex}`,
        status: false,
        upserteIds: [],
        deletedIds: []
      }
    }
  }

  Context.log('SyncGoogleCalendar - CalendarResult')


  const calendarEventsResult = await calendarEventsWorker.syncCalendarEvents(google, credential)

  const upserteIds = calendarEventsResult.upserteIds
  const deletedIds = calendarEventsResult.deletedIds

  if ( !calendarEventsResult.status ) {
    const message = 'Job Error - SyncGoogleCalendar Failed [Google To Rechat - events]'
    await handleException(credential, message, calendarEventsResult.ex)

    return {
      error: `${message} - ${calendarEventsResult.ex.message}`,
      status: false,
      upserteIds,
      deletedIds
    }
  }

  Context.log('SyncGoogleCalendar - CalendarEventsResult')


  return {
    error: null,
    status: true,
    upserteIds,
    deletedIds
  }
}

const syncRechatToGoogle = async (credential, userJob, query) => {
  const { user, calEvents } = await getEvents(credential, query)

  const firstEvent = calEvents[calEvents.length - 1] || null

  let error = null

  if ( calEvents.length === 0 ) {
    return {
      error,
      firstEvent
    }
  }

  const isInitialSync = userJob.start_at ? false : true

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
  // check to know if credential is still active
  const credential = await GoogleCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByGoogleCredential(credential.id)
    return
  }

  if ( !credential.google_calendar ) {
    // await UsersJob.upsertByGoogleCredential(credential, 'calendar', 'canceled')
    await UsersJob.deleteByGoogleCredentialAndJob(credential.id, 'calendar')
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByGoogleCredential(credential.id, 'calendar')
  if (!userJob) {
    // Context.log('SyncGoogleCalendar - Job skipped due to a pending job')
    return
  }

  /*
    check to know if current credential/job has already done ove the specific time period.
    *** Its disabled Because of supporting the real time sync.

    const diff = new Date().getTime() - new Date(userJob.start_at).getTime()
    if ( diff < config.calendar_integration.miliSec ) {
      return
    }
  */

  /*
    Lock users_jobs record

    select * from users_jobs where google_credential = credential.id AND job_name = 'calendar' FOR UPDATE;
    ==> lock will be released after commiting or rollbacking current transaction
  */
  await UsersJob.lockByGoogleCredential(credential.id, 'calendar')
  await UsersJob.upsertByGoogleCredential(credential, 'calendar', 'pending')

  // check google clients
  const google = await getGoogleClient(credential)
  if (!google) {
    Slack.send({ channel: 'integration_logs', text: `SyncGoogleCalendar Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJob.upsertByGoogleCredential(credential, 'calendar', 'failed')
    return
  }


  Context.log('SyncGoogleCalendar - Job Started', credential.id, credential.email)

  const last_start_at   = userJob.start_at ? new Date(userJob.start_at) : new Date(0)
  const last_updated_gt = last_start_at.getTime() / 1000


  let result = {}

  Context.log('SyncGoogleCalendar - [Google To Rechat]')
  result = await syncGoogleToRechat(google, credential)
  if (result.error) {
    await reportFailure(credential, result.error)
    return
  }
  Context.log('SyncGoogleCalendar - [Google To Rechat] Done')

  const upsertedTaskIds = result.upserteIds
  const deletedTaskIds  = result.deletedIds


  Context.log('SyncGoogleCalendar - [Rechat To Google]')
  result = await syncRechatToGoogle(credential, userJob, { last_updated_gt })
  if (result.error) {
    await reportFailure(credential, result.error)
    return
  }
  Context.log('SyncGoogleCalendar - [Rechat To Google] Done')


  // Report success
  await UsersJob.upsertByGoogleCredential(credential, 'calendar', 'success')

  if ( upsertedTaskIds.length || deletedTaskIds.length ) {
    const upserted = await retrieveEvents(credential, upsertedTaskIds)
    Socket.send('Calendar.Updated', credential.brand, [{ upserted, deleted: deletedTaskIds }])
  }

  Context.log('SyncGoogleCalendar - Job Finished')
  return
}

const handleWebhooks = async (data) => {
  const calendarId = data.payload.calendarId
  const channelId  = data.payload.channelId
  const resourceId = data.payload.resourceId

  let calendar
  let credential

  try {
    calendar = await GoogleCalendar.get(calendarId)
  } catch (ex) {
    // do nothing
    return
  }

  if (!calendar) {
    return
  }

  try {
    credential = await GoogleCredential.get(calendar.google_credential)
  } catch (ex) {
    // do nothing
    return
  }

  if ( !credential || !credential.google_calendar || credential.revoked || credential.deleted_at ) {
    return
  }

  // Stop Old Channel
  if ( calendar.watcher_channel_id !== channelId ) {
    const obj = {
      google_credential: calendar.google_credential,
      watcher: {
        id: channelId,
        resourceId: resourceId
      }
    }

    return await GoogleCalendar.stop(obj)
  }

  try {

    /*
      If we use this method, It will end up to a loop of fetching and scheduling sync jobs, we must pass directly the current job to the target/relevant queue.
      await UsersJob.forceSyncByGoogleCredential(credential.id, 'calendar')
    */

    const payload = {
      action: 'sync_google_calendar',
      cid: credential.id,
      immediate: true
    }

    publisher.Calendar.syncCalendar(syncCalendar)(payload)

  } catch (ex) {
    // do nothing
  }

  return
}


module.exports = {
  syncCalendar,
  handleWebhooks
}