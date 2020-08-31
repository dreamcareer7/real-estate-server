const db    = require('../../../utils/db.js')
const squel = require('../../../utils/squel_extensions')


/**
 * @param {UUID[]} ids
 */
const deleteMany = async (ids) => {
  return await db.selectIds('google/calendar_events/delete_many', [ids])
}

/**
 * @param {Object} calendar GoogleCalendar
 * @param {string[]} remoteEventIds GoogleCalendarEvent remote-id
 */
const deleteLocalByRemoteIds = async (calendar, remoteEventIds) => {
  return await db.selectIds('google/calendar_events/delete_by_remote_ids', [calendar.google_credential, calendar.id, remoteEventIds])
}

/**
 * @param {Object} calendar GoogleCalendar
 */
const deleteLocalByCalendar = async (calendar) => {
  return await db.select('google/calendar_events/delete_by_cal_id', [calendar.google_credential, calendar.id])
}

/**
 * @param {Any[]} records
 */
const bulkDelete = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('google_calendar_events', 'gcale')
      .set('deleted_at = now()')
      .from('update_values', 'uv')
      .where('gcale.google_credential = uv.google_credential::uuid')
      .where('gcale.google_calendar = uv.google_calendar::uuid')
      .where('gcale.event_id = uv.event_id')

    q.name = 'google/calendar_events/bulk_delete'

    return db.update(q, [])
  })  
}


module.exports = {
  deleteMany,
  bulkDelete,
  deleteLocalByRemoteIds,
  deleteLocalByCalendar
}