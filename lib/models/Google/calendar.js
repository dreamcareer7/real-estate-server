const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const GoogleCredential     = require('./credential')
const GoogleCalendarEvents = require('./calendar_events')
const { getGoogleClient }  = require('./plugin/client.js')


const GoogleCalendar = {}


const googleClient = async function (gcid) {
  const credential = await GoogleCredential.get(gcid)
  return await getGoogleClient(credential)
}

const updateLocal = async function (id, updatedCalendar) {
  return await db.select('google/calendar/update', [
    id,
    updatedCalendar.summary || null,
    updatedCalendar.description || null,
    updatedCalendar.location || null,
    updatedCalendar.timeZone || null,
  ])
}

const createLocal = async function (googleCredentialId, calendar) {
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

const listRemoteCalendars = async function (googleCredentialId) {
  const google = await googleClient(googleCredentialId)
  const result = await google.listCalendars()

  const calendars = []

  for ( const cal of result.items ) {
    if( cal.summary !== 'Contacts' )
      calendars.push(cal)
  }

  return calendars
}

const persistRemoteCalendar = async function (googleCredentialId, remoteCalendar) {
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
    remoteCalendar.deleted || false,
    remoteCalendar.primary || false,
    JSON.stringify(remoteCalendar.defaultReminders),
    JSON.stringify(remoteCalendar.notificationSettings),
    JSON.stringify(remoteCalendar.conference_properties),
    'google'
  ])
}

const deleteLocalByRemoteCalendarId = async function (googleCredentialId, remoteCalendarId) {
  await db.select('google/calendar/delete_by_remote_cal_id', [googleCredentialId, remoteCalendarId])

  const calendar = await GoogleCalendar.getByRemoteCalendarId(googleCredentialId, remoteCalendarId)

  return await GoogleCalendarEvents.deleteLocalByRemoteCalendarId(googleCredentialId, calendar.id)
}



GoogleCalendar.getAll = async (ids) => {
  return await db.select('google/calendar/get', [ids])
}

GoogleCalendar.get = async (id) => {
  const calendars = await GoogleCalendar.getAll([id])

  if (calendars.length < 1)
    return null

  return calendars[0]
}

GoogleCalendar.getByRemoteCalendarId = async (googleCredentialId, remoteCalendarId) => {
  const result = await db.select('google/calendar/get_by_remote_cal', [googleCredentialId, remoteCalendarId])

  return await GoogleCalendarEvents.get(result)
}

GoogleCalendar.getAllByGoogleCredential = async (googleCredentialId) => {
  const result = await db.select('google/calendar/get_by_credential', [googleCredentialId])

  const calendars = await GoogleCalendar.getAll(result)

  if (calendars.length < 1)
    return null

  return calendars
}

GoogleCalendar.publicize = async (model) => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at

  return model
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

  return await createLocal(googleCredentialId, calendar)
}

GoogleCalendar.update = async (googleCredentialId, body) => {
  const credential = await GoogleCredential.get(googleCredentialId)
  const google     = await getGoogleClient(credential)

  if (!credential.rechat_gcalendar)
    throw Error.ResourceNotFound('Rechat Google-Calendar has not created yet!')

  const calendar = await GoogleCalendar.get(credential.rechat_gcalendar)

  if (!calendar)
    throw Error.ResourceNotFound(`Google Calendar ${credential.rechat_gcalendar} not found.`)

  const updatedCalendar = await google.updateCalendar(calendar.calendar_id, body)
 
  return await updateLocal(calendar.id, updatedCalendar)
}

GoogleCalendar.updateSyncToken = async (id, syncToken) => {
  return await db.select('google/calendar/update_sync_token', [id, syncToken])
}


GoogleCalendar.persistRemoteCalendars = async (googleCredentialId, toSyncRemoteCalendarIds = []) => {
  const remoteCalendarsObj = await listRemoteCalendars(googleCredentialId)
  const createdCalendarIds = []

  for ( const remoteCalendar of remoteCalendarsObj.items ) {
    if ( toSyncRemoteCalendarIds.includes(remoteCalendar.id) ) {

      if ( remoteCalendar.deleted ) {
        await deleteLocalByRemoteCalendarId(googleCredentialId, remoteCalendar.id)

      } else {

        const id = await persistRemoteCalendar(googleCredentialId, remoteCalendar)
        createdCalendarIds.push(id)
      }
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

    const google         = await googleClient(googleCredentialId)
    const remoteCalendar = await google.getCalendar(conf.rechatCalendar.id)

    const calendar = {
      id: remoteCalendar.id,
      summary: remoteCalendar.summary,
      description: remoteCalendar.description,
      location: remoteCalendar.location,
      timeZone: remoteCalendar.timeZone,
      conferenceProperties: remoteCalendar.conferenceProperties || [],
      origin: 'google'
    }

    rechatCalendarId = await createLocal(googleCredentialId, calendar)
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



  //  Updated: 2015-07-29T18:12:37.324Z Created: undefined cancelled
  //  start: { date: '2000-01-01' } 
 

  return await google.syncEvents('saeed.uni68@gmail.com')
}



Orm.register('google_calendar', 'GoogleCalendar', GoogleCalendar)

module.exports = GoogleCalendar