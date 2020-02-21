const GoogleCredential = require('./credential')

const { getMockClient, getGoogleClient } = require('./plugin/client.js')
// const { syncCalendarEvents } = require('./workers/calendars/events')
// const historyWorker = require('./workers/gmail/history')
// const messageWorker = require('./workers/gmail/message')
// const { filter } = require('../Calendar/feed')
const { syncCalendar } = require('./workers/job_cal')


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

const watchMailBox = async (google) => {
  await google.watchMailBox()
}

const stopWatchMailBox = async (google) => {
  await google.stopWatchMailBox()
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
*/


const test = async (req, res) => {
  let result

  const cid = 'd22ec703-0515-4892-aa62-bc1fd0b1cf61' // '8edc420b-f9a1-45f9-b726-648ce1a83ced'

  const google = await getClient(cid)
  const googleCredential = await GoogleCredential.get(cid)

  const data = {
    googleCredential
  }

  // result = await syncCalendarEvents(google, data)
  // result = await watchMailBox(google)
  // await stopWatchMailBox(google)

  // result = await messageWorker.syncMessages(google, data)
  // result = await historyWorker.partialSync(google, data)

  await syncCalendar(data)

  return res.json(result || {})
}


  

module.exports = {
  test
}