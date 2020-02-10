// const Context = require('../../../Context')
// const Slack   = require('../../../Slack')
// const Socket  = require('../../../Socket')

const GoogleCredential    = require('../../../Google/credential')
const MicrosoftCredential = require('../../../Microsoft/credential')

const { handleCreatedEvents, handleUpdatedEvents, handleDeletedEvents } = require('./google/dispatcher')



const syncGoogleCalendar = async (data) => {
  const TS = new Date()
  const credential = data.googleCredential

  // const { created, updated, deleted } = await calendar_filter_x(credential.user, credential.brand, credential.calendars_last_sync_at)

  const created = []
  const updated = []
  const deleted = []

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