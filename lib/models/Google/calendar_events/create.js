const db    = require('../../../utils/db.js')
const squel = require('../../../utils/squel_extensions')


/**
 * @param {Object} googleCalendar
 * @param {Object} event
 */
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

/**
 * @param {Any[]} records
 */
const bulkUpsert = async (records) => {
  if (records.length === 0) {
    return []
  }

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


module.exports = {
  createLocal,
  bulkUpsert
}