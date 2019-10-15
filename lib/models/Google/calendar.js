const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')

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
  const credential    = await GoogleCredential.get(gcid)
  const google        = await getGoogleClient(credential)

  // await google.testCalendar()

  // timeZone: Formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich"
  const resource = {
    summary: 'summary',
    description: 'description',
  }

  const createdCalendar = await google.createCalendar(resource)

  await google.deleteCalendar(createdCalendar.id)

  return
}


Orm.register('google_calendar', 'GoogleCalendar', GoogleCalendar)

module.exports = GoogleCalendar