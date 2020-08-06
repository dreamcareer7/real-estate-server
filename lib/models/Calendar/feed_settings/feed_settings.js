const db = require('../../../utils/db.js')


/**
 * Creates a calendar feed setting record
 * @param {UUID} user_id 
 * @param {ICalendarFeedSettingInput} data 
 */
const create = async (user_id, data) => {
  return db.query.promise('calendar/create_feed_setting', [user_id, data.types, data.filter])
}

/**
 * Fetches the single calendar feed setting record for user id
 * @param {UUID} user_id 
 * @returns {Promise<ICalendarFeedSetting | undefined>}
 */
const get = async (user_id) => {
  return db.selectOne('calendar/get_feed_setting', [user_id])
}


module.exports = {
  create,
  get
}