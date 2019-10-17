const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const GoogleCredential    = require('./credential')
const { getGoogleClient } = require('./plugin/client.js')


const GoogleCalendar = {}


const googleClient = async function (gcid) {
  const credential = await GoogleCredential.get(gcid)
  return await getGoogleClient(credential)
}


GoogleCalendar.getAll = async (googleCredentialId, ids) => {
  const calendars = await db.select('google/calendar/get', [googleCredentialId, ids])

  return calendars
}

GoogleCalendar.get = async (googleCredentialId, id) => {
  const calendars = await GoogleCalendar.getAll(googleCredentialId, [id])

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


GoogleCalendar.listRemoteCalendars = async (googleCredentialId) => {
  const google = await googleClient(googleCredentialId)
  const result = await google.listCalendars()

  const calendars = []

  for ( const cal of result.items ) {
    if( cal.summary !== 'Contacts' )
      calendars.push(cal)
  }

  return calendars
}

GoogleCalendar.getByRemoteId = async (googleCredentialId, calendarId) => {
  const google = await googleClient(googleCredentialId)

  return await google.getCalendar(calendarId)
}

GoogleCalendar.createLocal = async (googleCredentialId, calendar) => {
  return db.insert('google/calendar/insert',[
    googleCredentialId,
    calendar.id,
    calendar.summary || null,
    calendar.description || null,
    calendar.location || null,
    calendar.timeZone || null,
    JSON.stringify(calendar.conferenceProperties),
    calendar.origin || 'rechat'
  ])
}

GoogleCalendar.create = async (googleCredentialId, body) => {
  /* body: {
    summary: 'summary',
    description: 'description',
    location: 'location' 
    timeZone: 'Formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich"'
  }*/
  
  const google   = await googleClient(googleCredentialId)
  const calendar = await google.createCalendar(body)

  return await GoogleCalendar.createLocal(googleCredentialId, calendar)
}

GoogleCalendar.updateLocal = async (calendar, updatedCalendar) => {
  return await db.select('google/calendar/update', [
    calendar.id,

    updatedCalendar.summary || null,
    updatedCalendar.description || null,
    updatedCalendar.location || null,
    updatedCalendar.timeZone || null,
  ])
}

GoogleCalendar.update = async (googleCredentialId, googleCalendar, body) => {
  const google   = await googleClient(googleCredentialId)
  const calendar = await GoogleCalendar.get(googleCredentialId, googleCalendar)

  if (!calendar)
    throw Error.ResourceNotFound(`Google Calendar ${googleCalendar} not found.`)

  // if ( calendar.origin !== 'rechat' )
  //   throw Error.Forbidden(`Access forbidden to calendar ${googleCalendar}`)

  const updatedCalendar = await google.updateCalendar(calendar.calendar_id, body)
 
  return await GoogleCalendar.updateLocal(calendar, updatedCalendar)
}

GoogleCalendar.deleteLocal = async (calendarId) => {
  return await db.select('google/calendar/delete', [calendarId])
}

GoogleCalendar.delete = async (googleCredentialId, id) => {
  const google   = await googleClient(googleCredentialId)
  const calendar = await GoogleCalendar.get(googleCredentialId, id)

  if (!calendar)
    throw Error.ResourceNotFound(`Google Calendar ${id} not found.`)

  if ( calendar.origin !== 'rechat' )
    throw Error.Forbidden(`Access forbidden to calendar ${id}`)

  await google.deleteCalendar(calendar.calendar_id)

  return await GoogleCalendar.deleteLocal(calendar.id)
}


GoogleCalendar.persistRemoteCalendar = async (googleCredentialId, remoteCalendar) => {
  return db.insert('google/calendar/remote_insert',[
    googleCredentialId,
    remoteCalendar.id,
    remoteCalendar.summary || null,
    remoteCalendar.summary_override || null,
    remoteCalendar.description || null,
    remoteCalendar.location || null,
    remoteCalendar.timeZone || null,
    remoteCalendar.accessRole,
    remoteCalendar.selected || false,
    remoteCalendar.primary || false,
    JSON.stringify(remoteCalendar.defaultReminders),
    JSON.stringify(remoteCalendar.notificationSettings),
    JSON.stringify(remoteCalendar.conference_properties),
    'google'
  ])
}

GoogleCalendar.persistRemoteCalendars = async (googleCredentialId, remoteCalendarIds = []) => {
  const remoteCalendarsObj = await GoogleCalendar.listRemoteCalendars(googleCredentialId)
  const createdCalendarIds = []

  for ( const remoteCalendar of remoteCalendarsObj.items ) {
    if ( remoteCalendarIds.includes(remoteCalendar.id) ) {
      const id = await GoogleCalendar.persistRemoteCalendar(googleCredentialId, remoteCalendar)
      createdCalendarIds.push(id)
    }
  }

  return createdCalendarIds
}

GoogleCalendar.configureCaledars = async (googleCredentialId, conf) => {
  /*
    conf: {
      rechatCalendar: {
        type: 'new',
        body: {
          summary: 'summary',
          description: 'description',
          location: 'Montreal',
          timeZone: 'America/Chicago'
        }
      },
      toSync: [x,y,z]
    }

    conf: {
      rechatCalendar: {
        type: 'old',
        id: 'my_custom_cal',
      },
      toSync: [x,y,z]
    }
  */

  let rechatCalendarId = null

  if ( conf.rechatCalendar.type === 'new' ) {
    rechatCalendarId = await GoogleCalendar.create(googleCredentialId, conf.rechatCalendar.body)

  } else {
    const remoteCalendar = await GoogleCalendar.getByRemoteId(googleCredentialId, conf.rechatCalendar.id)

    const calendar = {
      id: remoteCalendar.id,
      summary: remoteCalendar.summary,
      description: remoteCalendar.description,
      location: remoteCalendar.location,
      timeZone: remoteCalendar.timeZone,
      conferenceProperties: remoteCalendar.conferenceProperties || [],
      origin: 'google'
    }

    rechatCalendarId = await GoogleCalendar.createLocal(googleCredentialId, calendar)
  }

  await GoogleCalendar.persistRemoteCalendars(googleCredentialId, conf.toSync)
  return await GoogleCredential.updateRechatGoogleCalendar(googleCredentialId, rechatCalendarId)
}


GoogleCalendar.listEvents = async (googleCredentialId) => {
  const google = await googleClient(googleCredentialId)

  // skip status:cancelled

  /*
    id: 'a6f3jngd8qgqh2jg7b4vgtr08s@group.calendar.google.com',
    summary: 'my_custom_cal',

    id: 'saeed.uni68@gmail.com',
    summary: 'saeed.uni68@gmail.com',

    id: 'heshmat.zapata@gmail.com',
    summary: 'heshmat.zapata@gmail.com',

    id: 'addressbook#contacts@group.v.calendar.google.com',
    summary: 'Contacts',

    id: 'en.islamic#holiday@group.v.calendar.google.com',
    summary: 'Muslim Holidays',

    id: 'en.usa#holiday@group.v.calendar.google.com',
    summary: 'Holidays in United States',
  */

  return await google.listEvents('saeed.uni68@gmail.com')
}




Orm.register('google_calendar', 'GoogleCalendar', GoogleCalendar)

module.exports = GoogleCalendar