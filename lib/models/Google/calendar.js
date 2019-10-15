const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')

// const GoogleCredential    = require('./credential')
// const { getGoogleClient } = require('./plugin/client.js')


const GoogleCalendar = {}



GoogleCalendar.getAll = async (entry_ids, google_credential) => {
  const calendars = await db.select('google/calendar/get', [entry_ids, google_credential])

  return calendars
}

GoogleCalendar.get = async (entry_id, google_credential) => {
  const calendars = await GoogleCalendar.getAll([entry_id], google_credential)

  if (calendars.length < 1)
    return null

  return calendars[0]
}

GoogleCalendar.publicize = async (model) => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at

  return model
}

GoogleCalendar.create = async (records) => {
  return await db.chunked(records, 22, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_messages')
      .setFieldsRows(chunk)
      .onConflict(['google_credential', 'calendar_id'], {
        access_role: squel.rstr('EXCLUDED.access_role'),
        description: squel.rstr('EXCLUDED.description'),
        summary: squel.rstr('EXCLUDED.summary'),
        summary_override: squel.rstr('EXCLUDED.summary_override'),
        location: squel.rstr('EXCLUDED.location'),
        time_zone: squel.rstr('EXCLUDED.time_zone'),
        background_color: squel.rstr('EXCLUDED.background_color'),
        foreground_color: squel.rstr('EXCLUDED.foreground_color'),
        color_id: squel.rstr('EXCLUDED.color_id'),
        '"primary"': squel.rstr('EXCLUDED.primary'),
        hidden: squel.rstr('EXCLUDED.hidden'),
        selected: squel.rstr('EXCLUDED.selected'),
        deleted: squel.rstr('EXCLUDED.deleted'),
        default_reminders: squel.rstr('EXCLUDED.default_reminders'),
        conference_properties: squel.rstr('EXCLUDED.conference_properties'),
        notification_settings: squel.rstr('EXCLUDED.notification_settings'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, google_credential, calendar_id')

    q.name = 'google/calendar/bulk_upsert'

    return db.select(q)
  })  
}


GoogleCalendar.testCalendar = async (gcid) => {
  // const credential    = await GoogleCredential.get(gcid)
  // const google        = await getGoogleClient(credential)

  // await google.testCalendar()

  // timeZone: Formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich"
  // const resource = {
  //   summary: 'summary',
  //   description: 'description',
  // }
  // const createdCalendar = await google.createCalendar(resource)



  // const updated_resource = {
  //   summary: 'summary-updated',
  //   description: 'description',
  // }
  // const updatedCalendar = await google.updateCalendar(createdCalendar.id, updated_resource)
  // console.log('updatedCalendar', updatedCalendar)


  // await google.deleteCalendar(createdCalendar.id)


  // const event = {
  //   'summary': 'Google I/O 2019',
  //   'location': '800 Howard St., San Francisco, CA 94103',
  //   'description': 'A chance to hear more about Google\'s developer products.',
  //   'start': {
  //     'dateTime': '2019-10-20T09:00:00-07:00',
  //     'timeZone': 'America/Los_Angeles',
  //   },
  //   'end': {
  //     'dateTime': '2019-10-20T11:00:00-07:00',
  //     'timeZone': 'America/Los_Angeles',
  //   },
  //   'recurrence': [
  //     'RRULE:FREQ=DAILY;COUNT=2'
  //   ],
  //   'reminders': {
  //     'useDefault': false,
  //     'overrides': [
  //       {'method': 'email', 'minutes': 24 * 60},
  //       {'method': 'popup', 'minutes': 10},
  //     ],
  //   }
  // }
  // const myEvent = await google.createEvent('primary', event)
  // console.log('myEvent', myEvent)


  // const createdEvent = await google.getEvent('primary', myEvent.id)
  // console.log('createdEvent', createdEvent)


  // const options = {
  //   currentSyncToken: null,
  //   timeMin: '2019-10-15T11:00:00-07:00',
  //   timeMax: '2019-10-20T10:00:00-07:00'
  // }

  // const instances = await google.getEventInstances('primary', 'vga26n3i1u3mt3a97k7p6almhk', options)
  // console.log('instances', instances)
  

  // await google.deleteEvent('primary', 'vga26n3i1u3mt3a97k7p6almhk')


  // const event = {
  //   'summary': 'Google I/O 2000',
  //   'location': 'Tehran',
  //   'description': 'Hohahahahaaha',
  //   'start': {
  //     'dateTime': '2019-10-23T09:00:00-07:00',
  //     'timeZone': 'America/Los_Angeles',
  //   },
  //   'end': {
  //     'dateTime': '2019-10-24T11:00:00-07:00',
  //     'timeZone': 'America/Los_Angeles',
  //   },
  // }
  // const updatedEvent = await google.updateEvent('primary', 'vga26n3i1u3mt3a97k7p6almhk', event)
  // console.log('updatedEvent', updatedEvent)


  return
}


Orm.register('google_calendar', 'GoogleCalendar', GoogleCalendar)

module.exports = GoogleCalendar