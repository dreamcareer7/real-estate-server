const db = require('../../../utils/db.js')


/**
 * @param {Object} calendar 
 */
const deleteLocalByRemoteCalendarId = async function (calendar) {
  await db.select('microsoft/calendar/delete_by_remote_cal_id', [calendar.microsoft_credential, calendar.calendar_id])
}


module.exports = {
  deleteLocalByRemoteCalendarId
}