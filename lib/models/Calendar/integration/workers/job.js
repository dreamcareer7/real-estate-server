// const Context = require('../../../Context')
// const Slack   = require('../../../Slack')
// const Socket  = require('../../../Socket')

const User = require('../../../User')
const GoogleCredential    = require('../../../Google/credential')
const MicrosoftCredential = require('../../../Microsoft/credential')

const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./google/dispatcher')



const syncGoogleCalendar = async (data) => {
  const timestamp  = new Date()
  const credential = data.googleCredential

  const user = await User.get(credential.user)

  const calendarEvents = []
  // const calendarEvents = await calendar_filter_x(credential.user, credential.brand, credential.calendars_last_sync_at)
  const { created, updated, deleted } = await refineEvents(credential, calendarEvents, user.timezone)


  await handleCreatedEvents(credential, created)
  await handleDeletedEvents(credential, deleted)
  await handleUpdatedEvents(updated)

  await GoogleCredential.updateCalendarsLastSyncAt(credential.id, timestamp)
}

const syncMicrosoftCalendar = async (data) => {
  const timestamp  = new Date()
  const credential = data.microsoftCredential

  await MicrosoftCredential.updateCalendarsLastSyncAt(credential.id, timestamp)
}


module.exports = {
  syncGoogleCalendar,
  syncMicrosoftCalendar
}