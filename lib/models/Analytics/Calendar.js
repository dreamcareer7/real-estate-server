const db = require('../../utils/db.js')

const Orm = require('../Orm')
const contexts = require('../Deal/context/all')

class Calendar {
  static getForUser(user_id, brand_id, lo, hi) {
    return db.select('analytics/calendar/get', [
      user_id,
      brand_id,
      lo,
      hi
    ])
  }

  static publicize(event) {
    if (event.object_type === 'deal_context')
      event.type_label = contexts[event.event_type].label

    delete event.user
    delete event.brand
  }
}

Orm.register('calendar_event', 'Calendar', Calendar)

module.exports = Calendar
