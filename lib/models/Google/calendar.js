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



GoogleCalendar.testCalendar = async (gcid) => {
  // const google = await googleClient(gcid)


  // await google.testCalendar()

  // timeZone: Formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich"
  // const resource = {
  //   summary: 'summary',
  //   description: 'description',
  //   location: '800 Howard St., San Francisco, CA 94103'
  // }
  // const createdCalendar = await google.createCalendar(resource)
  // console.log('createdCalendar', createdCalendar)

  // const cal = await google.getCalendar('primary')
  // console.log('cal', cal)


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