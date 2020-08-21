const db = require('../../../utils/db.js')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('google/calendar_events/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const calendars = await getAll([id])

  if (calendars.length < 1)
    throw Error.ResourceNotFound(`Google calendar event by ${id} not found.`)

  return calendars[0]
}

/**
 * @param {Object} calendar GoogleCalendar
 * @param {string[]} events_remote_ids GoogleCalendarEvent remote-ids
 */
const getByCalendarAndEventRemoteIds = async (calendar, events_remote_ids) => {
  const ids = await db.selectIds('google/calendar_events/get_by_calendar_and_event_ids', [calendar.google_credential, calendar.id, events_remote_ids])

  return await getAll(ids)
}

/**
 * @param {UUID} gcid Google credential id
 * @param {UUID[]} calendar_ids Google calendar ids
 */
const getByCalendarIds = async (gcid, calendar_ids) => {
  return await db.selectIds('google/calendar_events/get_by_calendar_ids', [gcid, calendar_ids])
}

/**
 * @param {UUID} credential_id GoogleCredential id
 * @param {UUID} calendar_id GoogleCalendar.id
 * @param {string[]} events_remote_ids GoogleCalendarEvent remote-ids
 */
const getMovedEvents = async (credential_id, calendar_id, events_remote_ids) => {
  if ( events_remote_ids.length === 0 ) {
    return []
  }

  return await db.selectIds('google/calendar_events/get_moved_events', [credential_id, calendar_id, events_remote_ids])
}

/**
 * @param {UUID} cid google_credential_id
 */
const getGCredentialEventsNum = async (cid) => {
  return await db.select('google/calendar_events/count', [cid])
}


module.exports = {
  getAll,
  get,
  getByCalendarAndEventRemoteIds,
  getByCalendarIds,
  getMovedEvents,
  getGCredentialEventsNum,
}