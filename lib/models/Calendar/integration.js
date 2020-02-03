const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')


const CalendarIntegration = {}



CalendarIntegration.bulkUpsert = async (records) => {
  if (records.length === 0)
    return []

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('calendar_integration')
      .setFieldsRows(chunk)
      .onConflict(['rechat_id', 'google_id', 'microsoft_id'], {
        object_type: squel.rstr('EXCLUDED.object_type'),
        event_type: squel.rstr('EXCLUDED.event_type'),
        origin: squel.rstr('EXCLUDED.event_type'),
        // deleted_at: null,
        updated_at: squel.rstr('now()')
      })
      .returning('id, rechat_id, google_id, microsoft_id')

    q.name = 'calendar/integration/bulk_upsert'

    return db.select(q)
  })  
}

/**
 * @param {UUID[]} ids
 */
CalendarIntegration.getAll = async (ids) => {
  return await db.select('calendar/integration/get', [ids])
}

/**
 * @param {UUID} id
 */
CalendarIntegration.get = async (id) => {
  const calendars = await CalendarIntegration.getAll([id])

  if (calendars.length < 1)
    throw Error.ResourceNotFound(`Calendar integration by id ${id} not found.`)

  return calendars[0]
}

/**
 * @param {String} xxx
 */
CalendarIntegration.getByXXX = async (xxx) => {
  const ids = await db.selectIds('calendar/integration/get_by_xxxx', [xxx])

  if (ids.length < 1)
    return null

  return await CalendarIntegration.get(ids[0])
}

/**
 * @param {UUID[]} ids
 */
CalendarIntegration.deleteMany = async function (ids) {
  await db.select('calendar/integration/delete', [ids])
}



Orm.register('calendar_integration', 'CalendarIntegration', CalendarIntegration)

module.exports = CalendarIntegration