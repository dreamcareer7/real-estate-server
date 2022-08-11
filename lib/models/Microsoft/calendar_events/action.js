const { keyBy, uniqBy } = require('lodash')

const config  = require('../../../config')
const Context = require('../../Context')
const Slack   = require('../../Slack')

const getClient = require('../client')
const { generateCalendarEvent } = require('../workers/subscriptions/calendar/common')
const { bulkUpsert } = require('./create')
const { bulkDelete } = require('./delete')

const channel  = config.microsoft_integration.slack_channel



const checkStartEnd = resource => {
  if (!resource.start.timeZone)
    throw Error.BadRequest('Start timeZone is not specified.')

  if (!resource.end.timeZone)
    throw Error.BadRequest('End timeZone is not specified.')

  if (!resource.start.dateTime)
    throw Error.BadRequest('Start dateTime is not specified.')

  if (!resource.end.dateTime)
    throw Error.BadRequest('End dateTime is not specified.')
}

const validateResource = resource => {
  // if (!resource.subject)
  //   throw Error.BadRequest('Title is not specified.')

  if (!resource.start)
    throw Error.BadRequest('Start is not specified.')

  if (!resource.end)
    throw Error.BadRequest('End is not specified.')
  
  checkStartEnd(resource)
}


const batchInsert = async (credential, calendar, events) => {
  for (const event of events) {
    validateResource(event.resource)
  }

  const microsoft = await getClient(credential.id, 'calendar')
  const { confirmed, failed } = await microsoft.batchInsertEvent(events)
  Context.log('SyncMicrosoftCalendar - after batchInsertEvent')

  if (failed.length > 0) {
    const code  = 'ErrorPropertyValidationFailure'
    const codes = [...new Set(failed.filter(record => record?.body?.error?.code).map(record => record?.body?.error?.code))]
    const text  = `SyncMicrosoftCalendar Batch Insert Failed - ${credential.id} - codes: ${JSON.stringify(codes)}`

    /*
      Sample failed response:
      failed = [{
        "id": "1",
        "status": 400,
        "headers": {
          "Cache-Control": "private",
          "Content-Type": "application/json"
        },
        "body": {
          "error": {
            "code": "ErrorPropertyValidationFailure",
            "message": "At least one property failed validation.",
            "innerError": {
              "date": "2021-01-21T13:13:46",
              "request-id": "05284592-30d2-41cc-a086-0f3453d9906f",
              "client-request-id": "05284592-30d2-41cc-a086-0f3453d9906f"
            }
          }
        }
      }]
    */

    Context.log(text, failed.length, JSON.stringify(failed))

    if (codes.includes(code)) {
      Context.log(text, events.length, JSON.stringify(events))
    }

    Slack.send({ channel, text, emoji: ':skull:' })
  }

  const newEvents = confirmed.map(c => generateCalendarEvent(calendar, c.body))
  const microsoftCalEvents = await bulkUpsert(newEvents)
  Context.log('SyncMicrosoftCalendar - after bulkUpsert')
  return {
    microsoftCalEvents,
    error: null
  }
}

const batchUpdate = async (credential, events) => {
  for (const event of events) {
    validateResource(event.resource)
  }

  try {

    const byRemoteId = keyBy(events, 'eventId')
    const microsoft  = await getClient(credential.id, 'calendar')

    const { confirmed, failed } = await microsoft.batchUpdateEvent(events)

    if (failed.length > 0) {
      const text = `SyncMicrosoftCalendar Batch Update Failed - ${credential.id}`
      Context.log(text, failed.length, JSON.stringify(failed))
      Slack.send({ channel, text, emoji: ':skull:' })
    }

    const updatedEventIds = confirmed.map(c => c.body.id)
    const updatedEvents   = confirmed.map(c => { return generateCalendarEvent(byRemoteId[c.body.id].calendar, c.body) })
    const microsoftCalEvents = await bulkUpsert(uniqBy(updatedEvents, 'event_id'))

    const failedIntegrations = events.filter(e => !updatedEventIds.includes(e.eventId)).map(e => e.cid)

    if (failedIntegrations.length > 0) {
      const text = `SyncMicrosoftCalendar Batch Update Failed - ${credential.id}`
      Context.log(text, failedIntegrations.length, JSON.stringify(failedIntegrations))
      Slack.send({ channel, text, emoji: ':skull:' })
    }

    return {
      microsoftCalEvents,
      failedIntegrations,
      error: null
    }

  } catch (ex) {

    Context.log('SyncMicrosoftCalendar - MicrosoftCalendarEventBatchUpdate ex:', ex.message)
    throw ex
  }
}

const batchDelete = async (credential, events) => {
  const microsoft  = await getClient(credential.id, 'calendar')
  const { failed } = await microsoft.batchDeleteEvents(events)

  if (failed.length > 0) {
    const text = `SyncMicrosoftCalendar Batch Delete Failed - ${credential.id}`
    Context.log(text, failed.length, JSON.stringify(failed))
    Slack.send({ channel, text, emoji: ':skull:' })
    /*
      Sample:
      [{
        "id":"1",
        "status":404,
        "body":{"error":{"code":"ErrorItemNotFound","message":"The specified object was not found in the store."}}
      }]
    */
  }

  const records = events.map(e => ({
    microsoft_credential: e.calendar.microsoft_credential,
    microsoft_calendar: e.calendar.id,
    event_id: e.eventId
  }))

  return await bulkDelete(records)
}


module.exports = {
  batchInsert,
  batchUpdate,
  batchDelete
}
