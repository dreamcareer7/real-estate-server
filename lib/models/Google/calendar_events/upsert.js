const _ = require('lodash')

const db      = require('../../../utils/db.js')
const squel   = require('../../../utils/squel_extensions')
const Context = require('../../Context')

const getClient = require('../client')
const { generateCalendarEvent } = require('../workers/calendars/common')


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


const createLocal = async function (googleCalendar, event) {
  return db.insert('google/calendar_events/insert',[
    googleCalendar.google_credential,
    googleCalendar.id,
    event.id,

    event.description || null,
    event.summary || null,
    event.location || null,
    event.colorId || null,
    event.iCalUID || null,
    event.transparency || null,
    event.visibility || null,
    event.hangoutLink || null,
    event.htmlLink || null,
    event.status || null,
    event.sequence || null,
    
    event.anyoneCanAddSelf || false,
    event.guestsCanInviteOthers || true,
    event.guestsCanModify || false,
    event.guestsCanSeeOtherGuests || true,
    event.attendeesOmitted || false,
    event.locked || false,
    event.privateCopy || false,

    JSON.stringify(event.creator),
    JSON.stringify(event.organizer),
    JSON.stringify(event.attendees),
    JSON.stringify(event.attachments),
    JSON.stringify(event.conferenceData),
    JSON.stringify(event.extendedProperties),
    JSON.stringify(event.gadget),
    JSON.stringify(event.reminders),
    JSON.stringify(event.source),

    event.created,
    event.updated,

    JSON.stringify(event.start),
    JSON.stringify(event.end),
    event.endTimeUnspecified || false,
    JSON.stringify(event.recurrence),
    event.recurringEventId,
    JSON.stringify(event.originalStartTime),

    event.etag,
    'rechat'
  ])
}

const bulkUpsert = async (records) => {
  if (records.length === 0) {
    return []
  }

  /*
    .onConflict(['google_credential', 'event_id'], {
      google_calendar: squel.rstr('EXCLUDED.google_calendar'),
  */

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_calendar_events')
      .setFieldsRows(chunk)
      .onConflict(['google_credential', 'google_calendar', 'event_id'], {
        summary: squel.rstr('EXCLUDED.summary'),
        description: squel.rstr('EXCLUDED.description'),
        location: squel.rstr('EXCLUDED.location'),
        color_id: squel.rstr('EXCLUDED.color_id'),
        ical_uid: squel.rstr('EXCLUDED.ical_uid'),
        transparency: squel.rstr('EXCLUDED.transparency'),
        visibility: squel.rstr('EXCLUDED.visibility'),
        hangout_link: squel.rstr('EXCLUDED.hangout_link'),
        html_link: squel.rstr('EXCLUDED.html_link'),
        status: squel.rstr('EXCLUDED.status'),
        anyone_can_add_self: squel.rstr('EXCLUDED.anyone_can_add_self'),
        guests_can_invite_others: squel.rstr('EXCLUDED.guests_can_invite_others'),
        guests_can_modify: squel.rstr('EXCLUDED.guests_can_modify'),
        guests_can_see_other_guests: squel.rstr('EXCLUDED.guests_can_see_other_guests'),
        attendees_omitted: squel.rstr('EXCLUDED.attendees_omitted'),
        locked: squel.rstr('EXCLUDED.locked'),
        private_copy: squel.rstr('EXCLUDED.private_copy'),
        sequence: squel.rstr('EXCLUDED.sequence'),
        creator: squel.rstr('EXCLUDED.creator'),
        organizer: squel.rstr('EXCLUDED.organizer'),
        attendees: squel.rstr('EXCLUDED.attendees'),
        attachments: squel.rstr('EXCLUDED.attachments'),
        conference_data: squel.rstr('EXCLUDED.conference_data'),
        extended_properties: squel.rstr('EXCLUDED.extended_properties'),
        gadget: squel.rstr('EXCLUDED.gadget'),
        reminders: squel.rstr('EXCLUDED.reminders'),
        source: squel.rstr('EXCLUDED.source'),
        created: squel.rstr('EXCLUDED.created'),
        updated: squel.rstr('EXCLUDED.updated'),
        event_start: squel.rstr('EXCLUDED.event_start'),
        event_end: squel.rstr('EXCLUDED.event_end'),
        end_time_unspecified: squel.rstr('EXCLUDED.end_time_unspecified'),
        recurrence: squel.rstr('EXCLUDED.recurrence'),
        recurring_event_id: squel.rstr('EXCLUDED.recurring_event_id'),
        original_start_time: squel.rstr('EXCLUDED.original_start_time'),
        etag: squel.rstr('EXCLUDED.etag'),
        origin: squel.rstr('EXCLUDED.origin'),
        deleted_at: null,
        updated_at: squel.rstr('now()')
      })
      .returning('id, google_credential, google_calendar, event_id, extended_properties, etag')

    q.name = 'google/calendar_events/bulk_upsert'

    return db.select(q)
  })  
}

const bulkDelete = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('google_calendar_events', 'gcale')
      .set('deleted_at = now()')
      .from('update_values', 'uv')
      .where('gcale.google_credential = uv.google_credential::uuid')
      .where('gcale.google_calendar = uv.google_calendar::uuid')
      .where('gcale.event_id = uv.event_id')

    q.name = 'google/calendar_events/bulk_delete'

    return db.update(q, [])
  })  
}

/**
 * @param {UUID[]} ids
 * @param {UUID} calendar_id GoogleCalendar.id
 */
const updateCalendar = async (ids, calendar_id) => {
  if ( ids.length === 0 ) {
    return []
  }

  return await db.select('google/calendar_events/update_calendar', [ids, calendar_id])
}

/**
 * @param {UUID[]} ids
 */
const deleteMany = async (ids) => {
  return await db.selectIds('google/calendar_events/delete_many', [ids])
}

/**
 * @param {Object} calendar GoogleCalendar
 * @param {string[]} remoteEventIds GoogleCalendarEvent remote-id
 */
const deleteLocalByRemoteIds = async (calendar, remoteEventIds) => {
  return await db.selectIds('google/calendar_events/delete_by_remote_ids', [calendar.google_credential, calendar.id, remoteEventIds])
}

/**
 * @param {Object} calendar GoogleCalendar
 */
const deleteLocalByCalendar = async (calendar) => {
  return await db.select('google/calendar_events/delete_by_cal_id', [calendar.google_credential, calendar.id])
}


const batchInsert = async (credential, calendar, events) => {
  for (const event of events) {
    validateResource(event.resource)
  }

  let confirmedArr = []

  const byCalendar = _.groupBy(events, 'calendar.id')
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

  // updatinging any calendar event which is failed to created remote g_event, we will retry the sync process for that specific rechat_calendar_event 
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

  const byRemoteId = _.keyBy(events, 'eventId')
  const byCalendar = _.groupBy(events, 'calendar.id')
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

    if (failedIntegrations.length > 0) {
      Context.log('SyncGoogleCalendar batchUpdate failedIntegrations', failedIntegrations.length, JSON.stringify(failedIntegrations))
    }

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
  const byCalendar = _.groupBy(events, 'calendar.id')
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
  createLocal,
  bulkUpsert,
  bulkDelete,
  updateCalendar,
  deleteMany,
  deleteLocalByRemoteIds,
  deleteLocalByCalendar,
  batchInsert,
  batchUpdate,
  batchDelete
}