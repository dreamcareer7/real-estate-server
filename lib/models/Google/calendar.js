const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const GoogleCredential    = require('./credential')
const { getGoogleClient } = require('./plugin/client.js')


const GoogleCalendar = {}


const googleClient = async function (gcid) {
  const credential = await GoogleCredential.get(gcid)
  return await getGoogleClient(credential)
}


GoogleCalendar.getAll = async (googleCredential, ids) => {
  const calendars = await db.select('google/calendar/get', [googleCredential, ids])

  return calendars
}

GoogleCalendar.get = async (googleCredential, id) => {
  const calendars = await GoogleCalendar.getAll(googleCredential, [id])

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

GoogleCalendar.create = async (googleCredential, body) => {
  const google = await googleClient(googleCredential)

  /* body: {
    summary: 'summary',
    description: 'description',
    location: 'location' 
    timeZone: 'Formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich"'
  }*/

  const calendar = await google.createCalendar(body)

  return db.insert('google/calendar/insert',[
    googleCredential,
    calendar.id,
    calendar.summary || null,
    calendar.description || null,
    calendar.location || null,
    calendar.timeZone || null,
    JSON.stringify(calendar.conferenceProperties),
    'rechat'
  ])
}

GoogleCalendar.update = async (googleCredential, googleCalendar, body) => {
  const google   = await googleClient(googleCredential)
  const calendar = await GoogleCalendar.get(googleCredential, googleCalendar)

  if (!calendar)
    throw Error.ResourceNotFound(`Google Calendar ${googleCalendar} not found.`)

  // if ( calendar.origin !== 'rechat' )
  //   throw Error.Forbidden(`Access forbidden to calendar ${googleCalendar}`)

  const updatedCalendar = await google.updateCalendar(calendar.calendar_id, body)
 
  return await db.select('google/calendar/update', [
    calendar.id,

    updatedCalendar.summary || null,
    updatedCalendar.description || null,
    updatedCalendar.location || null,
    updatedCalendar.timeZone || null,
  ])
}

GoogleCalendar.delete = async (googleCredential, id) => {
  const google   = await googleClient(googleCredential)
  const calendar = await GoogleCalendar.get(googleCredential, id)

  if (!calendar)
    throw Error.ResourceNotFound(`Google Calendar ${id} not found.`)

  if ( calendar.origin !== 'rechat' )
    throw Error.Forbidden(`Access forbidden to calendar ${id}`)

  await google.deleteCalendar(calendar.calendar_id)

  return await db.select('google/calendar/delete', [calendar.id])
}


Orm.register('google_calendar', 'GoogleCalendar', GoogleCalendar)

module.exports = GoogleCalendar