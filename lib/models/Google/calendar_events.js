const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')

// const GoogleCredential = require('./credential')


const GoogleCalendarEvents = {}



GoogleCalendarEvents.getAll = async (entry_ids, google_credential) => {
  const calendars = await db.select('google/calendar_events/get', [entry_ids, google_credential])

  return calendars
}

GoogleCalendarEvents.get = async (entry_id, google_credential) => {
  const calendars = await GoogleCalendarEvents.getAll([entry_id], google_credential)

  if (calendars.length < 1)
    return null

  return calendars[0]
}

GoogleCalendarEvents.publicize = async (model) => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at

  return model
}

GoogleCalendarEvents.create = async (records) => {
  return await db.chunked(records, 22, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_messages')
      .setFieldsRows(chunk)
      .onConflict(['google_credential', 'google_calendar', 'event_id'], {
        description: squel.rstr('EXCLUDED.description'),
        summary: squel.rstr('EXCLUDED.summary'),
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
        '"start"': squel.rstr('EXCLUDED.start'),
        '"end"': squel.rstr('EXCLUDED.end'),
        end_time_unspecified: squel.rstr('EXCLUDED.end_time_unspecified'),
        recurrence: squel.rstr('EXCLUDED.recurrence'),
        recurring_eventId: squel.rstr('EXCLUDED.recurring_eventId'),
        original_start_time: squel.rstr('EXCLUDED.original_start_time'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, google_credential, calendar_id')

    q.name = 'google/calendar_events/bulk_upsert'

    return db.select(q)
  })  
}



Orm.register('google_calendar_events', 'GoogleCalendarEvents', GoogleCalendarEvents)

module.exports = GoogleCalendarEvents