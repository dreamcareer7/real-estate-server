const db = require('../../utils/db.js')

const Orm = require('../Orm')


class CalendarFeedSetting {
  static async create(userId, data) {
    return db.query.promise('analytics/calendar/create_feed_setting', [userId, data.brandId, data.types])
  }
  
  static async get(userId) {
    return db.select('analytics/calendar/get_feed_setting', [userId])
  }
}

Orm.register('calendar_feed_setting', 'CalendarFeedSetting', CalendarFeedSetting)

module.exports = CalendarFeedSetting