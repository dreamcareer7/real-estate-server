const { groupBy, keyBy } = require('lodash')

const Context = require('../../Context')

const getClient = require('../client')
const { generateCalendarEvent } = require('../workers/calendars/common')
const { bulkDelete } = require('./delete')
const { bulkUpsert } = require('./create')


const checkStartEnd = resource => {
  if (!resource.start.timeZone) {
    throw Error.BadRequest('Start timeZone is not specified.')
  }

  if (!resource.end.timeZone) {
    throw Error.BadRequest('End timeZone is not specified.')
  }

  if ( resource.start.date && resource.start.dateTime ) {
    throw Error.BadRequest('Its not allowed to send both Start.date and Start.dateTime.')
  }

  if ( resource.end.date && resource.end.dateTime ) {
    throw Error.BadRequest('Its not allowed to send both End.date and End.dateTime.')
  }

  if ( !resource.start.date && !resource.start.dateTime ) {
    throw Error.BadRequest('Either of Start.date or Start.dateTime is required.')
  }

  if ( !resource.end.date && !resource.end.dateTime ) {
    throw Error.BadRequest('Either of End.date or End.dateTime is required.')
  }
}

const validateResource = resource => {
  // if (!resource.summary) {
  //   throw Error.BadRequest('Summary is not specified.')
  // }

  if (!resource.start) {
    throw Error.BadRequest('Start is not specified.')
  }

  if (!resource.end) {
    throw Error.BadRequest('End is not specified.')
  }
  
  checkStartEnd(resource)
}


const batchInsert = async (credential, calendar, events) => {
  for (const event of events) {
    validateResource(event.resource)
  }

  let confirmedArr = []

  const byCalendar = groupBy(events, 'calendar.id')
  const google     = await getClient(credential.id, 'calendar')

  for ( const key of Object.keys(byCalendar) ) {
    const { confirmed, error } = await google.batchInsertEvent(byCalendar[key])

    if (error) {
      return {
        googleCalEvents: null,
        error: error
      }
    }

    confirmedArr = confirmedArr.concat(confirmed)
  }

  const errorCodes = [400, 403, 404]

  // const failedEvents = confirmedArr.filter(c => (c.error && errorCodes.includes(c.error.code)))

  const newEvents       = confirmedArr.filter(c => !(c.error && errorCodes.includes(c.error.code))).map(c => generateCalendarEvent(calendar, c))
  const googleCalEvents = await bulkUpsert(newEvents)

  return {
    googleCalEvents,
    error: null
  }
}

const batchUpdate = async (credential, events) => {
  for (const event of events) {
    validateResource(event.resource)
  }

  let confirmedArr = []

  const byRemoteId = keyBy(events, 'eventId')
  const byCalendar = groupBy(events, 'calendar.id')
  const google     = await getClient(credential.id, 'calendar')

  for ( const key of Object.keys(byCalendar) ) {
    const { confirmed, error } = await google.batchUpdateEvent(byCalendar[key])

    if (error) {
      return {
        googleCalEvents: null,
        error: error
      }
    }

    confirmedArr = confirmedArr.concat(confirmed)
  }

  try {
    const errorCodes = [400, 403, 404]

    const updatedEventIds = confirmedArr.filter(c => !(c.error && errorCodes.includes(c.error.code))).map(c => c.id)
    const updatedEvents   = confirmedArr.filter(c => !(c.error && errorCodes.includes(c.error.code))).map(c => { return generateCalendarEvent(byRemoteId[c.id].calendar, c) })
    const googleCalEvents = await bulkUpsert(updatedEvents)

    const failedIntegrations = events.filter(e => !updatedEventIds.includes(e.eventId)).map(e => e.cid)

    return {
      googleCalEvents,
      failedIntegrations,
      error: null
    }

  } catch (ex) {

    Context.log('SyncGoogleCalendar - GoogleCalendarEvent.batchUpdate ex:', ex.message, JSON.stringify(confirmedArr))
    throw ex
  }
}

const batchDelete = async (credential, events) => {
  const byCalendar = groupBy(events, 'calendar.id')
  const google     = await getClient(credential.id, 'calendar')

  for ( const key of Object.keys(byCalendar) ) {
    await google.batchDeleteEvents(byCalendar[key])
  }

  const records = events.map(e => ({
    google_credential: e.calendar.google_credential,
    google_calendar: e.calendar.id,
    event_id: e.eventId
  }))

  return await bulkDelete(records)
}


module.exports = {
  batchInsert,
  batchUpdate,
  batchDelete
}