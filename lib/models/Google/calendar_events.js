const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')

const GoogleCredential    = require('./credential')
const GoogleCalendar      = require('./calendar')
const { getGoogleClient } = require('./plugin/client.js')

const GoogleCalendarEvents = {}


const googleClient = async function (gcid) {
  const credential = await GoogleCredential.get(gcid)
  return await getGoogleClient(credential)
}


GoogleCalendarEvents.getAll = async (googleCredential, calendarId, eventIds) => {
  const calendars = await db.select('google/calendar_events/get', [googleCredential, calendarId, eventIds])

  return calendars
}

GoogleCalendarEvents.get = async (googleCredential, calendarId, eventId) => {
  const calendars = await GoogleCalendarEvents.getAll(googleCredential, calendarId, [eventId])

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



GoogleCalendarEvents.bulkInsert = async (records) => {
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
      .returning('id')

    q.name = 'google/calendar_events/bulk_upsert'

    return db.select(q)
  })  
}

GoogleCalendarEvents.createLocal = async (googleCredential, calendar, event) => {
  return db.insert('google/calendar_events/insert',[
    googleCredential,
    calendar.id,
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

GoogleCalendarEvents.create = async (googleCredential, googleCalendar, body) => {
  const google   = await googleClient(googleCredential)
  const calendar = await GoogleCalendar.get(googleCredential, googleCalendar)

  if (!calendar)
    throw Error.ResourceNotFound(`Google Calendar ${googleCalendar} not found.`)

  // if ( calendar.origin !== 'rechat' )
  //   throw Error.Forbidden(`Access forbidden to calendar ${googleCalendar}`)

  /*
    {
      "status": string,
      "summary": string,
      "description": string,
      "location": string,
      "colorId": string,

      "start": {
        "date": date,
        "dateTime": datetime,
        "timeZone": string
      },
      "end": {
        "date": date,
        "dateTime": datetime,
        "timeZone": string
      },
      "endTimeUnspecified": boolean,

      "recurrence": [
        string
      ],
      "recurringEventId": string,

      "originalStartTime": {
        "date": date,
        "dateTime": datetime,
        "timeZone": string
      },


      "reminders": {
        "useDefault": boolean,
        "overrides": [
          {
            "method": string,
            "minutes": integer
          }
        ]
      },

      "attachments": [
        {
          "fileUrl": string,
          "title": string,
          "mimeType": string,
          "iconLink": string,
          "fileId": string
        }
      ]
    }
  
    {
      summary: 'Google I/O 2019',
      location: '800 Howard St., San Francisco, CA 94103',
      description: 'A chance to hear more about Google\'s developer products.',
      start: {
        dateTime: '2019-10-20T09:00:00-07:00',
        timeZone: 'America/Los_Angeles'
      },
      end: {
        dateTime: '2019-10-20T11:00:00-07:00',
        timeZone: 'America/Los_Angeles'
      },
      recurrence: [
        'RRULE:FREQ=DAILY;COUNT=2'
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 }
        ]
      }
    }
  */

  const event = await google.createEvent(calendar.calendar_id, body)

  return await GoogleCalendarEvents.createLocal(googleCredential, calendar, event)
}

GoogleCalendarEvents.updateLocal = async (event, updatedEvent) => {
  return await db.select('google/calendar_events/update', [
    event.id,

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

    JSON.stringify(updatedEvent.start),
    JSON.stringify(updatedEvent.end),
    JSON.stringify(updatedEvent.recurrence),
    JSON.stringify(updatedEvent.originalStartTime)
  ])
}

GoogleCalendarEvents.update = async (googleCredential, googleCalendar, googleCalendarEvent, body) => {
  const google   = await googleClient(googleCredential)
  const calendar = await GoogleCalendar.get(googleCredential, googleCalendar)
  const event    = await GoogleCalendarEvents.get(googleCredential, googleCalendar, googleCalendarEvent)

  if (!calendar)
    throw Error.ResourceNotFound(`Google Calendar ${googleCalendar} not found.`)

  if (!event)
    throw Error.ResourceNotFound(`Google Calendar Event ${googleCalendarEvent} not found.`)

  // if ( calendar.origin !== 'rechat' || event.origin !== 'rechat' )
  //   throw Error.Forbidden(`Access forbidden to calendar ${body.calendarId}`)

  const updatedEvent = await google.updateEvent(calendar.calendar_id, event.event_id, body)
 
  return await GoogleCalendarEvents.updateLocal(event, updatedEvent)
}

GoogleCalendarEvents.deleteLocal = async (eventId) => {
  return await db.select('google/calendar_events/delete', [eventId])
}

GoogleCalendarEvents.delete = async (googleCredential, googleCalendar, googleCalendarEvent) => {
  const google   = await googleClient(googleCredential)
  const calendar = await GoogleCalendar.get(googleCredential, googleCalendar)
  const event    = await GoogleCalendarEvents.get(googleCredential, googleCalendar, googleCalendarEvent)

  if (!calendar)
    throw Error.ResourceNotFound(`Google Calendar ${googleCalendar} not found.`)

  if (!event)
    throw Error.ResourceNotFound(`Google Calendar Event ${googleCalendarEvent} not found.`)

  // if ( calendar.origin !== 'rechat' || event.origin !== 'rechat' )
  //   throw Error.Forbidden(`Access forbidden to calendar ${body.calendarId}`)

  await google.deleteEvent(calendar.calendar_id, event.event_id)

  return await GoogleCalendarEvents.deleteLocal(event.id)
}



Orm.register('google_calendar_events', 'GoogleCalendarEvents', GoogleCalendarEvents)

module.exports = GoogleCalendarEvents