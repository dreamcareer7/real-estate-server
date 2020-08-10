const db = require('../../../utils/db.js')


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


module.exports = {
  deleteMany,
  deleteLocalByRemoteIds,
  deleteLocalByCalendar
}