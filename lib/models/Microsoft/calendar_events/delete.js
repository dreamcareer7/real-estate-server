const db    = require('../../../utils/db.js')
const squel = require('../../../utils/squel_extensions')


/**
 * @param {UUID[]} ids
 */
const deleteMany = async (ids) => {
  return await db.selectIds('microsoft/calendar_events/delete_many', [ids])
}

/**
 * @param {Object} calendar MicrosoftCalendar
 * @param {string[]} remoteEventIds MicrosoftCalendarEvent remote-id
 */
const deleteLocalByRemoteIds = async (calendar, remoteEventIds) => {
  return await db.selectIds('microsoft/calendar_events/delete_by_remote_ids', [calendar.microsoft_credential, calendar.id, remoteEventIds])
}

/**
 * @param {Object} calendar MicrosoftCalendar
 */
const deleteLocalByCalendar = async (calendar) => {
  return await db.select('microsoft/calendar_events/delete_by_cal_id', [calendar.microsoft_credential, calendar.id])
}

/**
 * @param {Any[]} records
 */
const bulkDelete = async (records) => {
  if (records.length === 0)
    return []

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('microsoft_calendar_events', 'mcale')
      .set('deleted_at = now()')
      .from('update_values', 'uv')
      .where('mcale.microsoft_credential = uv.microsoft_credential::uuid')
      .where('mcale.microsoft_calendar = uv.microsoft_calendar::uuid')
      .where('mcale.event_id = uv.event_id')

    q.name = 'microsoft/calendar_events/bulk_delete'

    return db.update(q, [])
  })  
}



module.exports = {
  deleteMany,
  bulkDelete,
  deleteLocalByRemoteIds,
  deleteLocalByCalendar,
}