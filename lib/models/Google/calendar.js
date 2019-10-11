const db    = require('../../utils/db.js')
const Orm   = require('../Orm')

const GoogleCredential    = require('./credential')
const { getGoogleClient } = require('./plugin/client.js')


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


GoogleCalendar.testCalendar = async (gcid) => {
  const credential    = await GoogleCredential.get(gcid)
  const google        = await getGoogleClient(credential)

  return await google.testCalendar()
}


Orm.register('google_calendar', 'GoogleCalendar', GoogleCalendar)

module.exports = GoogleCalendar