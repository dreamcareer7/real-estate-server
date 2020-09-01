const db    = require('../../../utils/db.js')


/**
 * @param {UUID[]} ids
 * @param {UUID} calendar_id GoogleCalendar.id
 */
const updateCalendar = async (ids, calendar_id) => {
  if ( ids.length === 0 ) {
    return []
  }

  return await db.select('google/calendar_events/update_calendar', [ids, calendar_id])
}


module.exports = {
  updateCalendar
}