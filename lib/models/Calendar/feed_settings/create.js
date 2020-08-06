const db = require('../../../utils/db.js')


/**
 * Creates a calendar feed setting record
 * @param {UUID} user_id 
 * @param {ICalendarFeedSettingInput} data 
 */
const create = async (user_id, data) => {
  return db.query.promise('calendar/create_feed_setting', [user_id, data.types, data.filter])
}


module.exports = {
  create
}