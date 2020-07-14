const _ = require('lodash')

const Slack   = require('../Slack')
const Context = require('../Context')
const db      = require('../../utils/db.js')
const squel   = require('../../utils/squel_extensions')
const Orm     = require('../Orm')

const getClient = require('./client')
const { generateCalendarEvent } = require('./workers/subscriptions/calendar/common')

const MicrosoftCalendarEvent = {}



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


MicrosoftCalendarEvent.createLocal = async function (microsoftCalendar, event) {
  return db.insert('microsoft/calendar_events/insert',[
    microsoftCalendar.microsoft_credential,
    microsoftCalendar.id,
    event.id,
    event.subject || null,
    event.type || null,
    event.created_date_time || null,
    event.last_modified_date_time || null,
    event.original_end_time_zone || null,
    event.original_start_time_zone || null,
    JSON.stringify(event.start) || null,
    JSON.stringify(event.end) || null,
    JSON.stringify(event.location) || null,
    JSON.stringify(event.locations) || null,
    JSON.stringify(event.organizer) || null,
    JSON.stringify(event.recurrence) || null,
    JSON.stringify(event.body) || null,
    JSON.stringify(event.attendees) || null,
    JSON.stringify(event.categories) || null,
    JSON.stringify(event.response_status) || null,
    JSON.stringify(event.extensions) || null,
    event.has_attachments,
    event.is_all_day,
    event.is_cancelled,
    event.is_organizer,
    event.is_reminder_on,
    event.response_requested,
    event.change_key,
    event.ical_uid,
    event.importance,
    event.online_meeting_url,
    event.reminder_minutes_before_start,
    event.sensitivity,
    event.series_master_id,
    event.show_as || false,
    event.web_link,
    event.origin || 'rechat'
  ])
}

MicrosoftCalendarEvent.bulkUpsert = async (records) => {
  if (records.length === 0)
    return []

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_calendar_events')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'microsoft_calendar', 'event_id'], {
        subject: squel.rstr('EXCLUDED.subject'),
        type: squel.rstr('EXCLUDED.type'),
        created_date_time: squel.rstr('EXCLUDED.created_date_time'),
        last_modified_date_time: squel.rstr('EXCLUDED.last_modified_date_time'),
        original_end_time_zone: squel.rstr('EXCLUDED.original_end_time_zone'),
        original_start_time_zone: squel.rstr('EXCLUDED.original_start_time_zone'),
        event_start: squel.rstr('EXCLUDED.event_start'),
        event_end: squel.rstr('EXCLUDED.event_end'),
        location: squel.rstr('EXCLUDED.location'),
        locations: squel.rstr('EXCLUDED.locations'),
        organizer: squel.rstr('EXCLUDED.organizer'),
        recurrence: squel.rstr('EXCLUDED.recurrence'),
        body: squel.rstr('EXCLUDED.body'),
        attendees: squel.rstr('EXCLUDED.attendees'),
        categories: squel.rstr('EXCLUDED.categories'),
        response_status: squel.rstr('EXCLUDED.response_status'),
        has_attachments: squel.rstr('EXCLUDED.has_attachments'),
        is_all_day: squel.rstr('EXCLUDED.is_all_day'),
        is_cancelled: squel.rstr('EXCLUDED.is_cancelled'),
        is_organizer: squel.rstr('EXCLUDED.is_organizer'),
        is_reminder_on: squel.rstr('EXCLUDED.is_reminder_on'),
        response_requested: squel.rstr('EXCLUDED.response_requested'),
        extensions: squel.rstr('EXCLUDED.extensions'),
        change_key: squel.rstr('EXCLUDED.change_key'),
        ical_uid: squel.rstr('EXCLUDED.ical_uid'),
        importance: squel.rstr('EXCLUDED.importance'),
        online_meeting_url: squel.rstr('EXCLUDED.online_meeting_url'),
        reminder_minutes_before_start: squel.rstr('EXCLUDED.reminder_minutes_before_start'),
        sensitivity: squel.rstr('EXCLUDED.sensitivity'),
        series_master_id: squel.rstr('EXCLUDED.series_master_id'),
        show_as: squel.rstr('EXCLUDED.show_as'),
        web_link: squel.rstr('EXCLUDED.web_link'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, microsoft_calendar, event_id, extensions, change_key')

    q.name = 'microsoft/calendar_events/bulk_upsert'

    return db.select(q)
  })  
}

MicrosoftCalendarEvent.bulkDelete = async (records) => {
  if (records.length === 0)
    return []

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('microsoft_calendar_events', 'mcale')
      .set('deleted_at = now()')
      .from('update_values', 'uv')
      .where('mcale.microsoft_credential = uv.microsoft_credential::uuid')
      .where('mcale.microsoft_calendar = uv.microsoft_calendar::uuid')
      .where('mcale.event_id = uv.event_id')

    q.name = 'microsoft/calendar_events/bulk_delete'

    return db.update(q, [])
  })  
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
 * @param {string[]} events_remote_ids MicrosoftCalendarEvent remote-id
 */
MicrosoftCalendarEvent.getByCalendarAndEventRemoteIds = async (calendar, events_remote_ids) => {
  const ids = await db.selectIds('microsoft/calendar_events/get_by_calendar_and_event_ids', [calendar.microsoft_credential, calendar.id, events_remote_ids])

  return await MicrosoftCalendarEvent.getAll(ids)
}

/**
 * @param {UUID} mcid Microsoft credential id
 * @param {UUID[]} calendar_ids Microsoft calendar ids
 */
MicrosoftCalendarEvent.getByCalendarIds = async (mcid, calendar_ids) => {
  return await db.selectIds('microsoft/calendar_events/get_by_calendar_ids', [mcid, calendar_ids])
}

/**
 * @param {UUID[]} ids
 */
MicrosoftCalendarEvent.deleteMany = async (ids) => {
  return await db.selectIds('microsoft/calendar_events/delete_many', [ids])
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
  return await db.selectIds('microsoft/calendar_events/delete_by_remote_ids', [calendar.microsoft_credential, calendar.id, remoteEventIds])
}

/**
 * @param {Object} calendar MicrosoftCalendar
 */
MicrosoftCalendarEvent.deleteLocalByCalendar = async (calendar) => {
  return await db.select('microsoft/calendar_events/delete_by_cal_id', [calendar.microsoft_credential, calendar.id])
}

/**
 * @param {UUID} cid microsoft_credential_id
 */
MicrosoftCalendarEvent.getMCredentialEventsNum = async (cid) => {
  return await db.select('microsoft/calendar_events/count', [cid])
}

MicrosoftCalendarEvent.publicize = async (model) => {
  delete model.change_key
  delete model.can_edit
  delete model.can_share
  delete model.can_view_private_items

  return model
}

MicrosoftCalendarEvent.batchInsert = async (credential, calendar, events) => {
  for (const event of events) {
    validateResource(event.resource)
  }

  const microsoft = await getClient(credential.id, 'calendar')
  const { confirmed, failed } = await microsoft.batchInsertEvent(events)

  if (failed.length > 0) {
    const text = `SyncMicrosoftCalendar Batch Insert Failed - ${credential.id}`
    Context.log(text, failed.length, JSON.stringify(failed))
    Slack.send({ channel: 'integration_logs', text, emoji: ':skull:' })
  }

  const newEvents = confirmed.map(c => generateCalendarEvent(calendar, c.body))
  const microsoftCalEvents = await MicrosoftCalendarEvent.bulkUpsert(newEvents)

  return {
    microsoftCalEvents,
    error: null
  }
}

MicrosoftCalendarEvent.batchUpdate = async (credential, events) => {
  for (const event of events) {
    validateResource(event.resource)
  }

  try {

    const byRemoteId = _.keyBy(events, 'eventId')
    const microsoft  = await getClient(credential.id, 'calendar')

    const { confirmed, failed } = await microsoft.batchUpdateEvent(events)

    if (failed.length > 0) {
      const text = `SyncMicrosoftCalendar Batch Update Failed - ${credential.id}`
      Context.log(text, failed.length, JSON.stringify(failed))
      Slack.send({ channel: 'integration_logs', text, emoji: ':skull:' })
    }

    const updatedEventIds = confirmed.map(c => c.body.id)
    const updatedEvents   = confirmed.map(c => { return generateCalendarEvent(byRemoteId[c.body.id].calendar, c.body) })
    const microsoftCalEvents = await MicrosoftCalendarEvent.bulkUpsert(updatedEvents)

    const failedIntegrations = events.filter(e => !updatedEventIds.includes(e.eventId)).map(e => e.cid)

    if (failedIntegrations.length > 0) {
      const text = `SyncMicrosoftCalendar Batch Update Failed - ${credential.id}`
      Context.log(text, failedIntegrations.length, JSON.stringify(failedIntegrations))
      Slack.send({ channel: 'integration_logs', text, emoji: ':skull:' })
    }

    return {
      microsoftCalEvents,
      failedIntegrations,
      error: null
    }

  } catch (ex) {

    Context.log('SyncMicrosoftCalendar - MicrosoftCalendarEvent.batchUpdate ex:', ex.message)
    throw ex
  }
}

MicrosoftCalendarEvent.batchDelete = async (credential, events) => {
  const microsoft  = await getClient(credential.id, 'calendar')
  const { failed } = await microsoft.batchDeleteEvents(events)

  if (failed.length > 0) {
    const text = `SyncMicrosoftCalendar Batch Delete Failed - ${credential.id}`
    Context.log(text, failed.length, JSON.stringify(failed))
    Slack.send({ channel: 'integration_logs', text, emoji: ':skull:' })
  }

  const records = events.map(e => ({
    microsoft_credential: e.calendar.microsoft_credential,
    microsoft_calendar: e.calendar.id,
    event_id: e.eventId
  }))

  return await MicrosoftCalendarEvent.bulkDelete(records)
}



Orm.register('microsoft_calendar', 'MicrosoftCalendarEvent', MicrosoftCalendarEvent)

module.exports = MicrosoftCalendarEvent