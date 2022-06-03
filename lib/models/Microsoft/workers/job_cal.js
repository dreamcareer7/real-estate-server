const Context  = require('../../Context')
const Socket   = require('../../Socket')
const User     = require('../../User/get')
const UsersJob = require('../../UsersJob')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { get } = require('../credential/get')
const { getEvents, retrieveEvents } = require('../../Calendar/feed')

const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./subscriptions/calendar/dispatcher')
const calendarWorkers = require('./subscriptions/calendar')
const { handleException, reportFailure, lockJob, microsoftClient } = require('./helper')

const JOB_NAME = 'calendar'



const skipJob = (userJob) => {
  if (userJob.deleted_at) {
    return true
  }

  if ( userJob.resume_at && (new Date(userJob.resume_at).getTime() >= new Date().getTime()) ) {
    return true
  }

  return false
}

const syncMicrosoftToRechat = async (microsoft, credential, userJob) => {
  const user = await User.get(credential.user)

  const calendarResult = await calendarWorkers.calendars.HandleCalendars(microsoft, credential)

  if ( !calendarResult.status ) {
    const message = 'Microsoft-Calendar [Microsoft To Rechat - calendars]'
    const error   = `${message} - ${calendarResult.ex.message}`

    await handleException(userJob, message, calendarResult.ex)

    return {
      error,
      upserteIds: [],
      deletedIds: []
    }
  }

  if ( calendarResult.status ) {
    if ( calendarResult.ex === 'rechat-primary-cal-is-deleted' ) {
      const message = 'Microsoft-Calendar Sync Stopped [Microsoft To Rechat - calendars]'
      const error   = `${message} - ${calendarResult.ex}`

      await reportFailure(credential, error)
      await updateJobStatus(userJob.id, 'failed')
      await UsersJob.deleteByMicrosoftCredentialAndJob(credential.id, JOB_NAME)

      return {
        error,
        upserteIds: [],
        deletedIds: []
      } 
    }
  }

  Context.log('SyncMicrosoftCalendar - CalendarResult', calendarResult)


  const calendarEventsResult = await calendarWorkers.events.syncCalendarEvents(microsoft, credential, user.timezone)
  const upserteIds = calendarEventsResult.upserteIds
  const deletedIds = calendarEventsResult.deletedIds
  Context.log('SyncMicrosoftCalendar - calendarEventsResult', JSON.stringify({
    upserteIds: upserteIds.length, 
    deletedIds: deletedIds.length
  }))

  if ( !calendarEventsResult.status ) {
    const message = 'Microsoft-Calendar Sync Failed [Microsoft To Rechat - events]'
    const error   = `${message} - ${calendarEventsResult.ex.message}`

    await handleException(userJob, message, calendarEventsResult.ex)

    return {
      error,
      upserteIds,
      deletedIds
    }
  }

  Context.log('SyncMicrosoftCalendar - CalendarEventsResult')


  return {
    error: null,
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
  Context.log('SyncMicrosoftCalendar - afterRefineEvents:',JSON.stringify({created: created.length, updated: updated.length, deleted: deleted.length}))
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

  if (error) {
    await reportFailure(credential, error)
    await updateJobStatus(userJob.id, 'failed')
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
    return
  }

  if (skipJob(userJob)) {
    await updateJobStatus(userJob.id, 'waiting')
    return
  }

  await lockJob(userJob)

  const microsoft = await microsoftClient(credential, userJob)
  if (!microsoft) {
    return
  }

  const last_start_at   = userJob.start_at ? new Date(userJob.start_at) : new Date(0)
  const last_updated_gt = last_start_at.getTime() / 1000

  Context.log('SyncMicrosoftCalendar - Job Started', credential.id, credential.email, last_start_at)

  let result = {}

  Context.log('SyncMicrosoftCalendar - [Microsoft To Rechat]')
  result = await syncMicrosoftToRechat(microsoft, credential, userJob)
  if (result.error) {
    return
  }
  Context.log('SyncMicrosoftCalendar - [Microsoft To Rechat] Done')

  const upsertedTaskIds = result.upserteIds
  const deletedTaskIds  = result.deletedIds


  Context.log('SyncMicrosoftCalendar - [Rechat To Microsoft]')
  result = await syncRechatToMicrosoft(credential, userJob, { last_updated_gt })
  if (result.error) {
    return
  }
  Context.log('SyncMicrosoftCalendar - [Rechat To Microsoft] Done')


  // Report success
  await updateJobStatus(userJob.id, 'success')

  if ( upsertedTaskIds.length || deletedTaskIds.length ) {
    const upserted = await retrieveEvents(credential, upsertedTaskIds)
    Socket.send('Calendar.Updated', credential.brand, [{ upserted, deleted: deletedTaskIds }])
  }

  Context.log('SyncMicrosoftCalendar - Job Finished')
}


module.exports = {
  syncCalendar
}