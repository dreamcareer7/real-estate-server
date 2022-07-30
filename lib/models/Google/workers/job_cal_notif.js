const Context = require('../../Context')
const { get } = require('../credential/get')

const GoogleCalendar = {
  ...require('../calendar/get'),
  ...require('../calendar/upsert')
}

const calendarPublisher = require('./publisher/calendar/calendar')



const handleWebhooks = async (data) => {
  const calendarId = data.payload.calendarId
  const channelId  = data.payload.channelId
  const resourceId = data.payload.resourceId

  let calendar
  let credential

  try {
    calendar = await GoogleCalendar.get(calendarId)
  } catch (ex) {
    Context.log('Google handleWebhooks-Failed', ex)
    return
  }

  if (!calendar) {
    return
  }

  try {
    credential = await get(calendar.google_credential)
  } catch (ex) {
    Context.log('Google handleWebhooks-Failed', ex)
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
      If we use this method, It will end up in a loop of fetching and scheduling sync jobs,
      we must directly pass the current job to the target/relevant queue.
      await UsersJob.forceSyncByGoogleCredential(credential.id, 'calendar')
    */

    const payload = {
      action: 'sync_google_calendar',
      cid: credential.id,
      immediate: true
    }

    calendarPublisher.syncCalendar(payload)

  } catch (ex) {
    // do nothing
    Context.log('Google-Calendar handleWebhooks-Failed', ex)
  }
}


module.exports = {
  handleWebhooks
}