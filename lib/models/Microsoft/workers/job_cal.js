const Slack    = require('../../Slack')
const Context  = require('../../Context')
const Socket   = require('../../Socket')
const User     = require('../../User/get')
const UsersJob = require('../../UsersJob')

const { getEvents, retrieveEvents } = require('../../Calendar/feed')
const { get } = require('../credential/get')
const { getMGraphClient } = require('../plugin/client.js')
const { handleException } = require('./helper')

const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./subscriptions/calendar/dispatcher')
const calendarWorkers = require('./subscriptions/calendar')

const JOB_NAME = 'calendar'



const reportFailure = async (credential, error) => {
  const emoji = ':skull:'
  const text  = `SyncMicrosoftCalendar - Job Finished With Failure ${credential.id} - ${credential.email} - ${error}`

  Slack.send({ channel: 'integration_logs', text, emoji })

  await UsersJob.upsertByMicrosoftCredential(credential, JOB_NAME, 'failed')
}

const syncMicrosoftToRechat = async (microsoft, credential) => {
  const user = await User.get(credential.user)

  const calendarResult = await calendarWorkers.calendars.HandleCalendars(microsoft, credential)

  if ( !calendarResult.status ) {
    const message = 'Job Error - Microsoft-Calendar Sync Failed [Microsoft To Rechat - calendars]'
    await handleException(credential, JOB_NAME, message, calendarResult.ex)

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

  Context.log('SyncMicrosoftCalendar - CalendarResult', calendarResult)


  const calendarEventsResult = await calendarWorkers.events.syncCalendarEvents(microsoft, credential, user.timezone)

  const upserteIds = calendarEventsResult.upserteIds
  const deletedIds = calendarEventsResult.deletedIds

  if ( !calendarEventsResult.status ) {
    const message = 'Job Error - Microsoft-Calendar Sync Failed [Microsoft To Rechat - events]'
    await handleException(credential, JOB_NAME, message, calendarEventsResult.ex)

    return {
      error: `${message} - ${calendarEventsResult.ex.message}`,
      status: false,
      upserteIds,
      deletedIds
    }
  }

  Context.log('SyncMicrosoftCalendar - CalendarEventsResult')


  return {
    error: null,
    status: true,
    upserteIds,
    deletedIds
  }
}

const syncRechatToMicrosoft = async (credential, userJob, query) => {
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

  // printLogs(calEvents, created, updated, deleted)

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
  const credential = await get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByMicrosoftCredential(credential.id)
    return
  }

  if ( !credential.microsoft_calendar ) {
    await UsersJob.deleteByMicrosoftCredentialAndJob(credential.id, JOB_NAME)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByMicrosoftCredential(credential.id, JOB_NAME)
  if (!userJob) {
    // Context.log('SyncMicrosoftCalendar - Job skipped due to a pending job')
    return
  }

  if (userJob.resume_at) {
    if ( new Date(userJob.resume_at).getTime() > new Date().getTime() ) {
      Context.log('SyncMicrosoftCalendar - Job skipped due to the paused job', credential.id)
      return
    }
  }

  /*
    Lock users_jobs record

    select * from users_jobs where microsoft_credential = credential.id AND job_name = JOB_NAME FOR UPDATE;
    ==> lock will be released after commiting or rollbacking current transaction
  */
  await UsersJob.lockByMicrosoftCredential(credential.id, JOB_NAME)
  await UsersJob.upsertByMicrosoftCredential(credential, JOB_NAME, 'pending')

  const { microsoft } = await getMGraphClient(credential)
  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: `SyncMicrosoftCalendar Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJob.upsertByMicrosoftCredential(credential, JOB_NAME, 'failed')
    return
  }


  Context.log('SyncMicrosoftCalendar - Job Started', credential.id, credential.email)

  const last_start_at   = userJob.start_at ? new Date(userJob.start_at) : new Date(0)
  const last_updated_gt = last_start_at.getTime() / 1000


  let result = {}

  Context.log('SyncMicrosoftCalendar - [Microsoft To Rechat]')
  result = await syncMicrosoftToRechat(microsoft, credential)
  if (result.error) {
    await reportFailure(credential, result.error)
    return
  }
  Context.log('SyncMicrosoftCalendar - [Microsoft To Rechat] Done')

  const upsertedTaskIds = result.upserteIds
  const deletedTaskIds  = result.deletedIds


  Context.log('SyncMicrosoftCalendar - [Rechat To Microsoft]')
  result = await syncRechatToMicrosoft(credential, userJob, { last_updated_gt })
  if (result.error) {
    await reportFailure(credential, result.error)
    return
  }
  Context.log('SyncMicrosoftCalendar - [Rechat To Microsoft] Done')


  // Report success
  await UsersJob.upsertByMicrosoftCredential(credential, JOB_NAME, 'success')

  if ( upsertedTaskIds.length || deletedTaskIds.length ) {
    const upserted = await retrieveEvents(credential, upsertedTaskIds)
    Socket.send('Calendar.Updated', credential.brand, [{ upserted, deleted: deletedTaskIds }])
  }

  Context.log('SyncMicrosoftCalendar - Job Finished')
}


module.exports = {
  syncCalendar
}