const Context = require('../../Context')
const Slack   = require('../../Slack')

const User = require('../../User')
const GoogleCredential = require('../credential')

const calendarWorker       = require('./calendars/calendar')
const calendarEventsWorker = require('./calendars/events')

const { getGoogleClient } = require('../plugin/client.js')
const { filter } = require('../../Calendar/feed')
const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./calendars/dispatcher')



const syncCalendar = async (data) => {
  const start_time = new Date()

  // const currentGoogleCredential = await GoogleCredential.get(data.googleCredential.id)
  // const googleJobDuplicateCheck = new Date(currentGoogleCredential.last_sync_at).getTime() !== new Date(data.googleCredential.last_sync_at).getTime()

  // if ( googleJobDuplicateCheck || currentGoogleCredential.revoked || currentGoogleCredential.deleted_at ) {
  //   Slack.send({ channel: 'integration_logs', text: 'Google-Calendar Sync Job Is Skipped', emoji: ':skull:' })
  //   return
  // }

  const google = await getGoogleClient(data.googleCredential)

  if (!google) {
    Slack.send({ channel: 'integration_logs', text: 'Google-Calendar Sync Job Is Skipped, Client Is Failed', emoji: ':skull:' })
    return
  }

  const handleException = async function(msg, ex) {
    if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
      await GoogleCredential.disableEnableSync(data.googleCredential.id, 'disable')
    }

    const obj = {
      id: data.googleCredential.id,
      email: data.googleCredential.email,
      revoked: data.googleCredential.revoked,
      last_sync_at: data.googleCredential.last_sync_at
    }

    const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Google-Calendar Job postponed`
    const emoji = ':bell:'

    // Slack.send({ channel: '7-server-errors',  text, emoji })
    Slack.send({ channel: 'integration_logs', text, emoji })

    await GoogleCredential.postponeSync(data.googleCredential.id)

    return
  }

  Context.log('SyncGoogleCalendar - start job', data.googleCredential.id, data.googleCredential.email)


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



  // Sync Calendar [Rechat to Google]
  const last_updated_gt = new Date(data.googleCredential.calendars_last_sync_at).getTime() / 1000 || null
  const query           = last_updated_gt ? { last_updated_gt } : {}

  const user      = await User.get(data.googleCredential.user)
  const calEvents = await filter(data.googleCredential.brand, data.googleCredential.user, query)

  // const lastEvent   = calEvents[calEvents.length - 1] // check order
  // const lastEventTS = lastEvent.last_updated_gt // check last succesfull saved event

  let errorFlag = false

  const { created, updated, deleted } = await refineEvents(data.googleCredential, calEvents, user.timezone)


  Context.log('--- calEvents.length', calEvents.length)
  // Context.log('--- calEvents', calEvents[0])

  Context.log('--- created.length', created.length)
  // Context.log('--- created', created[0])

  Context.log('--- updated.length', updated.length)
  // Context.log('--- updated', updated[0])

  Context.log('--- deleted.length', deleted.length)
  // Context.log('--- deleted', deleted[0])



  if ( created.length !== 0 ) {
    const { result, error } = await handleCreatedEvents(data.googleCredential, created.slice(0, 15))
    console.log('---- handleCreatedEvents result', result.length)

    if (error) {
      errorFlag = true
    }
  }

  if ( updated.length !== 0 ) {
    const { error } = await handleUpdatedEvents(data.googleCredential, updated.slice(0, 3))

    if (error) {
      errorFlag = true
    }
  }

  if ( deleted.length !== 0 ) {
    await handleDeletedEvents(data.googleCredential, deleted)
  }

  const sync_duration_two = new Date().getTime() - start_time.getTime()



  // Update as Success
  if (!errorFlag) {
    await GoogleCredential.updateCalendarsLastSyncAt(data.googleCredential.id, start_time)
  }


  Context.log('SyncGoogleCalendar - job Finish', data.googleCredential.id, data.googleCredential.email, (sync_duration_one + sync_duration_two))

  return
}


module.exports = {
  syncCalendar
}