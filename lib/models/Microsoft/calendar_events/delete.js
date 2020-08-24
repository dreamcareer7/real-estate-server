const db = require('../../../utils/db.js')


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


module.exports = {
  deleteMany,
  deleteLocalByRemoteIds,
  deleteLocalByCalendar,
}