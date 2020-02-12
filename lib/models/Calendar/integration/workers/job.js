// const Context = require('../../../Context')
// const Slack   = require('../../../Slack')
// const Socket  = require('../../../Socket')

const GoogleCredential    = require('../../../Google/credential')
const MicrosoftCredential = require('../../../Microsoft/credential')

const { refineEvents, handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./google/dispatcher')



const syncGoogleCalendar = async (data) => {
  const TS = new Date()
  const credential = data.googleCredential

  // const calendarEvents = await calendar_filter_x(credential.user, credential.brand, credential.calendars_last_sync_at)
  const calendarEvents = []

  const createdOrUpdated = calendarEvents.map(e => !e.deleted_at)
  const { created, updated, deleted } = await refineEvents(credential, createdOrUpdated)

  await handleCreatedEvents(credential, created)
  await handleUpdatedEvents(credential, updated)
  await handleDeletedEvents(credential, deleted)

  await GoogleCredential.updateCalendarsLastSyncAt(credential.id, TS)
}

const syncMicrosoftCalendar = async (data) => {
  const TS = new Date()
  const credential = data.microsoftCredential

  await MicrosoftCredential.updateCalendarsLastSyncAt(credential.id, TS)
}


module.exports = {
  syncGoogleCalendar,
  syncMicrosoftCalendar
}