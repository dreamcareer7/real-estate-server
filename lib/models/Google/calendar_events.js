const config = require('../../config')
const db     = require('../../utils/db.js')
const Orm    = require('../Orm')
const squel  = require('../../utils/squel_extensions')

const GoogleCredential = require('./credential')
const { getMockClient, getGoogleClient } = require('./plugin/client.js')

const GoogleCalendarEvent = {}

const SCOPE_GMAIL_READONLY = config.google_scopes.calendar[0]


/**
 * @param {UUID} credential_id 
 */
const getClient = async (credential_id) => {
  if ( process.env.NODE_ENV === 'tests' ) {
    return getMockClient()
  }

  const credential = await GoogleCredential.get(credential_id)

  if (credential.revoked)
    throw Error.BadRequest('Google-Credential is revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Google-Credential is deleted!')

  if (!credential.scope.includes(SCOPE_GMAIL_READONLY))
    throw Error.BadRequest('Access is denied! Insufficient permission.')

  const google = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client failed!')

  return google
}

const helper = async function (googleCalendar) {
  const credential = await GoogleCredential.get(googleCalendar.google_credential)
  const google     = await getClient(credential.id)

  return {
    credential,
    google
  }
}

const createRemote = async function (googleCalendar, body) {
  const { google } = await helper(googleCalendar)

  return await google.createEvent(googleCalendar.calendar_id, body)
}

const updateRemote = async function (oldEvent, googleCalendar, body) {
  const { google } = await helper(googleCalendar)

  const remoteEvent = await google.getEvent(googleCalendar.calendar_id, oldEvent.event_id)

  if (!remoteEvent)
    throw Error.ResourceNotFound(`Google event ${oldEvent.event_id} not found.`)

  if ( remoteEvent.updated > oldEvent.update ) {
    return {
      status: 204,
      local: oldEvent,
      remote: remoteEvent
    }    
  }

  const updatedEvent = await google.updateEvent(googleCalendar.calendar_id, oldEvent.event_id, body)
 
  await GoogleCalendarEvent.updateLocal(oldEvent.id, updatedEvent)

  return {
    status: 200,
    local: oldEvent,
    remote: updatedEvent
  }
}

const deleteRemote = async function (oldEvent, googleCalendar) {
  const { google } = await helper(googleCalendar)

  await google.deleteEvent(googleCalendar.calendar_id, oldEvent.event_id)
  await GoogleCalendarEvent.deleteLocal(oldEvent.id)

  return
}


GoogleCalendarEvent.createLocal = async function (googleCalendar, event) {
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

    'rechat'
  ])
}

GoogleCalendarEvent.bulkUpsert = async (records) => {
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
        recurring_eventId: squel.rstr('EXCLUDED.recurring_eventId'),
        original_start_time: squel.rstr('EXCLUDED.original_start_time'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, google_credential, google_calendar, event_id')

    q.name = 'google/calendar_events/bulk_upsert'

    return db.select(q)
  })  
}

GoogleCalendarEvent.updateLocal = async function (id, updatedEvent) {
  return await db.selectIds('google/calendar_events/update', [
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
GoogleCalendarEvent.getAll = async (ids) => {
  return await db.select('google/calendar_events/get', [ids])
}

/**
 * @param {UUID} id
 */
GoogleCalendarEvent.get = async (id) => {
  const calendars = await GoogleCalendarEvent.getAll([id])

  if (calendars.length < 1)
    throw Error.ResourceNotFound(`Google calendar event by ${id} not found.`)

  return calendars[0]
}

/**
 * @param {Object} calendar GoogleCalendar
 */
GoogleCalendarEvent.getByCalendar = async (calendar) => {
  const ids = await db.selectIds('google/calendar_events/get_by_calendar', [calendar.google_credential, calendar.id])

  return await GoogleCalendarEvent.getAll(ids)
}

/**
 * @param {Object} calendar GoogleCalendar
 * @param {string[]} events_remote_ids GoogleCalendarEvent remote-id
 */
GoogleCalendarEvent.getByCalendarAndEventRemoteIds = async (calendar, events_remote_ids) => {
  const ids = await db.selectIds('google/calendar_events/get_by_calendar_and_event_ids', [calendar.google_credential, calendar.id, events_remote_ids])

  return await GoogleCalendarEvent.getAll(ids)
}

/**
 * @param {UUID} id
 */
GoogleCalendarEvent.deleteLocal = async function (id) {
  return await db.select('google/calendar_events/delete', [id])
}

/**
 * @param {Object} calendar GoogleCalendar
 * @param {string[]} remoteEventIds GoogleCalendarEvent remote-id
 */
GoogleCalendarEvent.deleteLocalByRemoteIds = async (calendar, remoteEventIds) => {
  return await db.select('google/calendar_events/delete_by_remote_ids', [calendar.google_credential, calendar.id, remoteEventIds])
}

/**
 * @param {Object} calendar GoogleCalendar
 * @param {string[]} remoteEventIds GoogleCalendarEvent remote-id
 */
GoogleCalendarEvent.restoreLocalByRemoteIds = async (calendar, remoteEventIds) => {
  return await db.select('google/calendar_events/restore_by_remote_ids', [calendar.google_credential, calendar.id, remoteEventIds])
}

/**
 * @param {Object} calendar GoogleCalendar
 */
GoogleCalendarEvent.deleteLocalByRemoteCalendarId = async (calendar) => {
  return await db.select('google/calendar_events/delete_by_cal_id', [calendar.google_credential, calendar.id])
}

GoogleCalendarEvent.publicize = async (model) => {
  delete model.iCalUID
  delete model.transparency
  delete model.visibility
  delete model.hangoutLink
  delete model.htmlLink
  delete model.sequence
  delete model.anyoneCanAddSelf
  delete model.guestsCanInviteOthers
  delete model.guestsCanModify
  delete model.guestsCanSeeOtherGuests
  delete model.attendeesOmitted
  delete model.locked
  delete model.privateCopy
  delete model.creator
  delete model.organizer
  delete model.attachments
  delete model.conferenceData
  delete model.gadget
  delete model.source
  delete model.originalStartTime

  return model
}


GoogleCalendarEvent.create = async (googleCalendar, body) => {
  const event = await createRemote(googleCalendar, body)

  return await GoogleCalendarEvent.createLocal(googleCalendar, event)
}

GoogleCalendarEvent.update = async (id, googleCalendar, body) => {
  const oldEvent = await GoogleCalendarEvent.get(id)

  if (!oldEvent)
    throw Error.ResourceNotFound(`Google Calendar Event ${id} not found.`)

  const { status, local, remote } = await updateRemote(oldEvent, googleCalendar, body)

  if ( status === 204 )
    return local

  await GoogleCalendarEvent.updateLocal(local.id, remote)

  return await GoogleCalendarEvent.get(local.id)
}

GoogleCalendarEvent.delete = async (id, googleCalendar) => {
  const oldEvent = await GoogleCalendarEvent.get(id)

  if (!oldEvent)
    throw Error.ResourceNotFound(`Google Calendar Event ${id} not found.`)

  await deleteRemote(oldEvent, googleCalendar)

  return await GoogleCalendarEvent.get(oldEvent.id)
}


Orm.register('google_calendar_events', 'GoogleCalendarEvent', GoogleCalendarEvent)

module.exports = GoogleCalendarEvent