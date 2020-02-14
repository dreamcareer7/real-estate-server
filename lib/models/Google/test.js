const GoogleCredential = require('./credential')

const { getMockClient, getGoogleClient } = require('./plugin/client.js')
const { syncCalendarEvents } = require('./workers/calendars/events')
// const historyWorker = require('./workers/gmail/history')
// const messageWorker = require('./workers/gmail/message')

const { filter } = require('../Calendar/feed')
const { syncGoogleCalendar } = require('../Calendar/integration/workers/job')


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
  crm_task
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

  contact_attribute => {
    id: 'e13c3e99-0573-4768-a1a7-327d6a22c6f3',
    created_by: '5d28b208-33b1-11e8-a0bb-0a95998482ac',
    created_at: 1581611249.12715,
    updated_at: 1581611249.12715,
    object_type: 'contact_attribute',
    event_type: 'birthday',
    type_label: 'Birthday',
    timestamp: 600091140,
    date: 1989-01-06T00:00:00.000Z,
    next_occurence: 2021-01-06T00:00:00.000Z,
    end_date: null,
    recurring: true,
    title: "Mohamad Zarinfar's Birthday",
    crm_task: null,
    deal: null,
    contact: '40527c4e-abbd-4a41-9597-2b78b827efaa',
    campaign: null,
    credential_id: null,
    thread_key: null,
    activity: null,
    users: [ '5d28b208-33b1-11e8-a0bb-0a95998482ac' ],
    accessible_to: null,
    people: [ { id: '40527c4e-abbd-4a41-9597-2b78b827efaa', type: 'contact' } ],
    people_len: 1,
    brand: '86ea3b4c-9455-11e9-af57-0a95998482ac',
    status: null,
    metadata: { is_partner: false },
    timestamp_readable: 1989-01-06T00:00:00.000Z,
    timestamp_midday: 1989-01-06T12:00:00.000Z,
    type: 'calendar_event'
  }
  deal_context => {
    id: '12f176a3-764e-47db-85ce-029a1a07628d:6ddb95b8-4e7e-11ea-8c9d-027d31a1f7a0',
    created_by: '5d28b208-33b1-11e8-a0bb-0a95998482ac',
    created_at: 1581611550.37162,
    updated_at: 1581611550.37162,
    object_type: 'deal_context',
    event_type: 'home_anniversary',
    type_label: 'Home Anniversary',
    timestamp: 1581552000,
    date: 2020-02-13T00:00:00.000Z,
    next_occurence: 2021-02-13T00:00:00.000Z,
    end_date: null,
    recurring: true,
    title: '1000  Nantucket Drive Unit B',
    crm_task: null,
    deal: '6be29888-4e7e-11ea-9064-027d31a1f7a0',
    contact: '12f176a3-764e-47db-85ce-029a1a07628d',
    campaign: null,
    credential_id: null,
    thread_key: null,
    activity: null,
    users: [
      '07b597e6-8d33-11e9-b5ee-0a95998482ac',
      '5d28b208-33b1-11e8-a0bb-0a95998482ac',
      '9fdcdf2a-8e0f-11e9-988e-0a95998482ac'
    ],
    accessible_to: null,
    people: [
      { id: 'f151f92a-8fe4-4d60-ad69-11075f03f725', type: 'contact' },
      { id: '4c98c20d-c1af-478a-97c7-ca916dcec5f5', type: 'contact' },
      { id: '4aa72d47-7f85-43bd-8395-140ea923cbf3', type: 'contact' },
      { id: '12f176a3-764e-47db-85ce-029a1a07628d', type: 'contact' }
    ],
    people_len: null,
    brand: '86ea3b4c-9455-11e9-af57-0a95998482ac',
    status: null,
    metadata: null,
    timestamp_readable: 2020-02-13T00:00:00.000Z,
    timestamp_midday: 2020-02-13T12:00:00.000Z,
    type: 'calendar_event'
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
  let result

  const cid = 'd22ec703-0515-4892-aa62-bc1fd0b1cf61' // '8edc420b-f9a1-45f9-b726-648ce1a83ced'

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

  await syncGoogleCalendar(data)

  return res.json(result || {})
}

const test_filter = async (req, res) => {
  const low  = new Date().getTime() - (10 * 24 * 60 * 60 * 1000)
  const high = new Date().getTime()

  // tokes: MTM1MTAwOWEtNGYwMi0xMWVhLWE2OGEtMDI3ZDMxYTFmN2Ew
  // brand: 86ea3b4c-9455-11e9-af57-0a95998482ac
  // user:  5d28b208-33b1-11e8-a0bb-0a95998482ac
  // result = await filter(googleCredential.brand, googleCredential.user, { low, high })
  const result = await filter('86ea3b4c-9455-11e9-af57-0a95998482ac', '5d28b208-33b1-11e8-a0bb-0a95998482ac', { low, high })

  let crm_task = false
  let contact = false
  let contact_attribute = false
  let deal_context = false
  let deleted_at = false

  const records = []

  for (const record of result) {
    console.log('record.deleted_at', record.deleted_at)

    if ( !deleted_at && record.deleted_at ) {
      deleted_at = true
      records.push(record)
      continue
    }

    if ( !crm_task && record.object_type === 'crm_task' ) {
      crm_task = true
      records.push(record)
    }

    if ( !contact && record.object_type === 'contact' ) {
      contact = true
      records.push(record)
    }

    if ( !contact_attribute && record.object_type === 'contact_attribute' ) {
      contact_attribute = true
      records.push(record)
    }

    if ( !deal_context && record.object_type === 'deal_context' ) {
      deal_context = true
      records.push(record)
    }
  }

  console.log('records =>', records)
}
  

module.exports = {
  test
}