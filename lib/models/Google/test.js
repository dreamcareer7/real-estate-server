const GoogleCredential = require('./credential')

const { getMockClient, getGoogleClient } = require('./plugin/client.js')
const { syncCalendarEvents } = require('./workers/calendars/events')
// const historyWorker = require('./workers/gmail/history')
// const messageWorker = require('./workers/gmail/message')

const { filter } = require('../Calendar/feed')


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
const tasks = [
  {
    'id': 'd5513e61-eea1-4522-9c29-1788b2f03489',
    'created_by': '8725b638-3b09-11e7-b651-0242ac110003',
    'created_at': 1581321416.3986,
    'updated_at': 1581321416.3986,
    'object_type': 'crm_task',
    'event_type': 'Other',
    'type_label': 'Other',
    'timestamp': 1580688000,
    'date': '2020-02-03T00:00:00.000Z',
    'next_occurence': null,
    'end_date': 1580774400,
    'recurring': false,
    'title': 'Recurrent Event - editedxxx',
    'crm_task': 'd5513e61-eea1-4522-9c29-1788b2f03489',
    'deal': null,
    'contact': null,
    'campaign': null,
    'credential_id': null,
    'thread_key': null,
    'users': [
      '8725b638-3b09-11e7-b651-0242ac110003'
    ],
    'accessible_to': null,
    'people': [
      {
        'type': 'reference',
        'object_type': 'contact',
        'id': '4714b2aa-7367-45c1-b538-aa65c78c9126'
      },
      {
        'type': 'reference',
        'object_type': 'contact',
        'id': '8fca30b8-cc8c-47fc-a4f9-d44ba7dc04d1'
      },
      {
        'type': 'reference',
        'object_type': 'contact',
        'id': '15cd5509-7907-46e2-8473-0e04647e09a4'
      }
    ],
    'people_len': 3,
    'status': 'DONE',
    'metadata': {
      'status': 'DONE'
    },
    'timestamp_readable': '2020-02-03T00:00:00.000Z',
    'timestamp_midday': '2020-02-03T12:00:00.000Z',
    'type': 'calendar_event'
  },
  {
    'id': '2bee9adf-a58b-4e8c-a6ba-15e1af7d4ff8',
    'created_by': '8725b638-3b09-11e7-b651-0242ac110003',
    'created_at': 1581321416.3986,
    'updated_at': 1581321416.3986,
    'object_type': 'crm_task',
    'event_type': 'Other',
    'type_label': 'Other',
    'timestamp': 1581292800,
    'date': '2020-02-10T00:00:00.000Z',
    'next_occurence': null,
    'end_date': 1581379200,
    'recurring': false,
    'title': 'Today Event',
    'crm_task': '2bee9adf-a58b-4e8c-a6ba-15e1af7d4ff8',
    'deal': null,
    'contact': null,
    'campaign': null,
    'credential_id': null,
    'thread_key': null,
    'users': [
      '8725b638-3b09-11e7-b651-0242ac110003'
    ],
    'accessible_to': null,
    'people': null,
    'people_len': 0,
    'status': 'DONE',
    'metadata': {
      'status': 'DONE'
    },
    'timestamp_readable': '2020-02-10T00:00:00.000Z',
    'timestamp_midday': '2020-02-10T12:00:00.000Z',
    'type': 'calendar_event'
  }
]
*/

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
  // result = await syncCalendarEvents(google, data)
  // result = await watchMailBox(google)
  // await stopWatchMailBox(google)

  // result = await messageWorker.syncMessages(google, data)
  // result = await historyWorker.partialSync(google, data)


  const low  = new Date().getTime() - (10 * 24 * 60 * 60 * 1000)
  const high = new Date().getTime()

  result = await filter(googleCredential.brand, googleCredential.user, { low, high })

  return res.json(result || {})
}

module.exports = {
  test
}