const AWS = require('aws-sdk')

const GoogleCredential = require('./credential')

const { getMockClient, getGoogleClient } = require('./plugin/client.js')
const { syncCalendarEvents } = require('./workers/calendars/events')
// const historyWorker = require('./workers/gmail/history')
// const messageWorker = require('./workers/gmail/message')



const getClient = async (cid) => {
  if ( process.env.NODE_ENV === 'tests' ) {
    return getMockClient()
  }

  const credential = await GoogleCredential.get(cid)

  // if (credential.revoked)
  //   throw Error.BadRequest('Google-Credential is revoked!')

  // if (credential.deleted_at)
  //   throw Error.BadRequest('Google-Credential is deleted!')

  // if (!credential.scope.includes(SCOPE_GMAIL_READONLY))
  //   throw Error.BadRequest('Access is denied! Insufficient permission.')

  const google = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client failed!')

  return google
}


/*
const deleteCalendars = async (data, deletedCalendarIds) => {
  console.log('-------- deletedCalendarIds ==>', deletedCalendarIds)

  const google_event_ids = await GoogleCalendarEvent.getByCalendarIds(data.googleCredential.id, deletedCalendarIds)
  console.log('-------- deleted google_event_ids ==>', google_event_ids)

  const {ids} = await CrmTask.filter(data.googleCredential.user, data.googleCredential.brand, { google_event_ids })
  console.log('-------- deleted crm_tasks ==>', ids)

  await CrmTask.remove(ids, data.googleCredential.user)
}

const updateCalendarsWatcher = async (data) => {
  const toSyncLocalCalendars    = await getToSyncCalendars(data.googleCredential.id)
  const toSyncRemoteCalendarIds = toSyncLocalCalendars.map(record => record.calendar_id)

  // It is possibe that some of the remote calendars are deleted
  // So we call persistRemoteCalendars to update offline calendars and exclude deleted ones.
  const result          = await GoogleCalendar.persistRemoteCalendars(data.googleCredential.id, toSyncRemoteCalendarIds)
  const activeCalendars = await GoogleCalendar.getAll(result.activeCalendarIds)

  await deleteCalendars(data, result.deletedCalendarIds)
}

const watchMailBox = async (google) => {
  await google.watchMailBox()
}

const stopWatchMailBox = async (google) => {
  await google.stopWatchMailBox()
}
*/


const test = async (req, res) => {
  let result = {}

  const cid = '8edc420b-f9a1-45f9-b726-648ce1a83ced'

  const google = await getClient(cid)
  const googleCredential = await GoogleCredential.get(cid)

  const data = {
    googleCredential
  }

  // result = await updateCalendarsWatcher(data)
  result = await syncCalendarEvents(google, data)
  // result = await watchMailBox(google)
  // await stopWatchMailBox(google)

  // result = await messageWorker.syncMessages(google, data)
  // result = await historyWorker.partialSync(google, data)

  return res.json(result || {})
}

module.exports = {
  test
}