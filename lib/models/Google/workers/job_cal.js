const Context  = require('../../Context')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob/google')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { getEvents, retrieveEvents } = require('../../Calendar/feed')
const GoogleCredential = require('../credential/get')

const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./calendars/dispatcher')
const { handleException, reportFailure, lockJob, googleClient } = require('./helper')
const calendarWorker       = require('./calendars/calendar')
const calendarEventsWorker = require('./calendars/events')

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

const syncGoogleToRechat = async (google, credential, userJob) => {
  const calendarResult = await calendarWorker.updateCalendarsWatcher(credential)
  if ( !calendarResult.status ) {
    const message = 'SyncGoogleCalendar Failed [Google To Rechat - calendars]'
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
      const message = 'SyncGoogleCalendar Stopped [Google To Rechat - calendars]'
      const error   = `${message} - ${calendarResult.ex}`

      await reportFailure(credential, error)
      await updateJobStatus(userJob.id, 'failed')
      await UsersJob.deleteByGoogleCredentialAndJob(credential.id, JOB_NAME)

      return {
        error,
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
    const message = 'SyncGoogleCalendar Failed [Google To Rechat - events]'
    const error   = `${message} - ${calendarEventsResult.ex.message}`

    await handleException(userJob, message, calendarEventsResult.ex)

    return {
      error,
      upserteIds,
      deletedIds
    }
  }

  Context.log('SyncGoogleCalendar - CalendarEventsResult')


  return {
    error: null,
    upserteIds,
    deletedIds
  }
}

const syncRechatToGoogle = async (credential, userJob, query) => {
  const { user, calEvents } = await getEvents(credential, query)
  
  const firstEvent = calEvents[calEvents.length - 1] || null
  Context.log(`SyncGoogleCalendar - RechatToGoogle, calEvents length:${calEvents.length}`)
  let error = null

  if ( calEvents.length === 0 ) {
    return {
      error,
      firstEvent
    }
  }

  const isInitialSync = userJob.start_at ? false : true
  const { created, updated, deleted } = await refineEvents(credential, calEvents, user.timezone, isInitialSync)
  Context.log(`SyncGoogleCalendar - RechatToGoogle  created.length:${created.length}, updated.length:${updated.length}, deleted.length:${deleted.length}, error:${error}`)
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
  const credential = await GoogleCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByGoogleCredential(credential.id)
    return
  }

  if ( !credential.google_calendar ) {
    await UsersJob.deleteByGoogleCredentialAndJob(credential.id, JOB_NAME)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByGoogleCredential(credential.id, JOB_NAME)
  if (!userJob) {
    return
  }

  if (skipJob(userJob)) {
    await updateJobStatus(userJob.id, 'waiting')
    return
  }

  await lockJob(userJob)

  const google = await googleClient(credential, userJob)
  if (!google) {
    return
  }


  Context.log('SyncGoogleCalendar - Job Started', credential.id, credential.email)

  const last_start_at   = userJob.start_at ? new Date(userJob.start_at) : new Date(0)
  const last_updated_gt = last_start_at.getTime() / 1000


  Context.log('SyncGoogleCalendar - [Google To Rechat]')
  const googleToRechat = await syncGoogleToRechat(google, credential, userJob)
  if (googleToRechat.error) {
    return
  }
  Context.log('SyncGoogleCalendar - [Google To Rechat] Done')

  const upsertedTaskIds = googleToRechat.upserteIds
  const deletedTaskIds  = googleToRechat.deletedIds


  Context.log('SyncGoogleCalendar - [Rechat To Google] last_updated_gt', last_updated_gt)
  const rechatToGoogle = await syncRechatToGoogle(credential, userJob, { last_updated_gt })
  if (rechatToGoogle.error) {
    return
  }
  Context.log('SyncGoogleCalendar - [Rechat To Google] Done')


  // Report success
  await updateJobStatus(userJob.id, 'success')

  if ( upsertedTaskIds.length || deletedTaskIds.length ) {
    const upserted = await retrieveEvents(credential, upsertedTaskIds)
    Socket.send('Calendar.Updated', credential.brand, [{ upserted, deleted: deletedTaskIds }])
  }

  Context.log('SyncGoogleCalendar - Job Finished')
}


module.exports = {
  syncCalendar
}