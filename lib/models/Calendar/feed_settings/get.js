const db = require('../../../utils/db.js')


/**
 * Fetches the single calendar feed setting record for user id
 * @param {UUID} user_id 
 * @returns {Promise<ICalendarFeedSetting | undefined>}
 */
const get = async (user_id) => {
  return db.selectOne('calendar/get_feed_setting', [user_id])
}


module.exports = {
  get
}