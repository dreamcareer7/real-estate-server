const config  = require('../../config')
const db      = require('../../utils/db.js')
const squel   = require('../../utils/squel_extensions')
const Orm     = require('../Orm')

const MicrosoftCredential = require('./credential')
const { getMockClient, getMGraphClient }  = require('./plugin/client.js')


const MicrosoftCalendarEvent = {}

const SCOPE_OUTLOOK_CAL = config.microsoft_scopes.calendar[0]


const getMicrosoftClient = async (credential) => {
  if ( process.env.NODE_ENV === 'tests' ) {
    return getMockClient()
  }

  if (credential.revoked)
    throw Error.BadRequest('Microsoft-Credential is revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Microsoft-Credential is deleted!')

  if (!credential.scope.includes(SCOPE_OUTLOOK_CAL))
    throw Error.BadRequest('Access is denied! Insufficient permission.')

  const microsoft  = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')

  return microsoft
}


MicrosoftCalendarEvent.createLocal = async function (microsoftCalendar, event) {
  return db.insert('microsoft/calendar_events/insert',[
    microsoftCalendar.microsoft_credential,
    microsoftCalendar.id,
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

    'rechat'
  ])
}

MicrosoftCalendarEvent.bulkUpsert = async (records) => {
  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_calendar_events')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'microsoft_calendar', 'event_id'], {
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
        recurring_eventId: squel.rstr('EXCLUDED.recurring_eventId'),
        original_start_time: squel.rstr('EXCLUDED.original_start_time'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, microsoft_calendar, event_id')

    q.name = 'microsoft/calendar_events/bulk_upsert'

    return db.select(q)
  })  
}

MicrosoftCalendarEvent.updateLocal = async function (id, updatedEvent) {
  return await db.selectIds('microsoft/calendar_events/update', [
    id,

    updatedEvent.description || null,
    updatedEvent.summary || null,
    updatedEvent.location || null,
    updatedEvent.colorId || null,
    updatedEvent.transparency || null,
    updatedEvent.visibility || null,
    updatedEvent.status || null,
    updatedEvent.sequence || null,
    
    updatedEvent.anyoneCanAddSelf || false,
    updatedEvent.guestsCanInviteOthers || true,
    updatedEvent.guestsCanModify || false,
    updatedEvent.guestsCanSeeOtherGuests || true,
    updatedEvent.attendeesOmitted || false,

    JSON.stringify(updatedEvent.attendees),
    JSON.stringify(updatedEvent.attachments),
    JSON.stringify(updatedEvent.conferenceData),
    JSON.stringify(updatedEvent.extendedProperties),
    JSON.stringify(updatedEvent.gadget),
    JSON.stringify(updatedEvent.reminders),
    JSON.stringify(updatedEvent.source),

    JSON.stringify(updatedEvent.event_start || updatedEvent.start),
    JSON.stringify(updatedEvent.event_end || updatedEvent.end),
    JSON.stringify(updatedEvent.recurrence),
    JSON.stringify(updatedEvent.originalStartTime)
  ])
}


/**
 * @param {UUID[]} ids
 */
MicrosoftCalendarEvent.getAll = async (ids) => {
  return await db.select('microsoft/calendar_events/get', [ids])
}

/**
 * @param {UUID} id
 */
MicrosoftCalendarEvent.get = async (id) => {
  const calendars = await MicrosoftCalendarEvent.getAll([id])

  if (calendars.length < 1)
    throw Error.ResourceNotFound(`Microsoft calendar event by ${id} not found.`)

  return calendars[0]
}

/**
 * @param {Object} calendar MicrosoftCalendar
 */
MicrosoftCalendarEvent.getByCalendar = async (calendar) => {
  const ids = await db.selectIds('microsoft/calendar_events/get_by_calendar', [calendar.microsoft_credential, calendar.id])

  return await MicrosoftCalendarEvent.getAll(ids)
}

/**
 * @param {Object} calendar MicrosoftCalendar
 * @param {string[]} events_remote_ids MicrosoftCalendarEvent remote-id
 */
MicrosoftCalendarEvent.getByCalendarAndEventRemoteIds = async (calendar, events_remote_ids) => {
  const ids = await db.selectIds('microsoft/calendar_events/get_by_calendar_and_event_ids', [calendar.microsoft_credential, calendar.id, events_remote_ids])

  return await MicrosoftCalendarEvent.getAll(ids)
}

/**
 * @param {UUID} id
 */
MicrosoftCalendarEvent.deleteLocal = async function (id) {
  return await db.select('microsoft/calendar_events/delete', [id])
}

/**
 * @param {Object} calendar MicrosoftCalendar
 * @param {string[]} remoteEventIds MicrosoftCalendarEvent remote-id
 */
MicrosoftCalendarEvent.deleteLocalByRemoteIds = async (calendar, remoteEventIds) => {
  return await db.select('microsoft/calendar_events/delete_by_remote_ids', [calendar.microsoft_credential, calendar.id, remoteEventIds])
}

/**
 * @param {Object} calendar MicrosoftCalendar
 * @param {string[]} remoteEventIds MicrosoftCalendarEvent remote-id
 */
MicrosoftCalendarEvent.restoreLocalByRemoteIds = async (calendar, remoteEventIds) => {
  return await db.select('microsoft/calendar_events/restore_by_remote_ids', [calendar.microsoft_credential, calendar.id, remoteEventIds])
}

/**
 * @param {Object} calendar MicrosoftCalendar
 */
MicrosoftCalendarEvent.deleteLocalByCalendar = async (calendar) => {
  return await db.select('microsoft/calendar_events/delete_by_cal_id', [calendar.microsoft_credential, calendar.id])
}

MicrosoftCalendarEvent.publicize = async (model) => {
  // delete model.xxxx

  return model
}




Orm.register('microsoft_calendar', 'MicrosoftCalendarEvent', MicrosoftCalendarEvent)

module.exports = MicrosoftCalendarEvent