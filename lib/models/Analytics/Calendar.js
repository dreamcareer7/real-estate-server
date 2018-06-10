const db = require('../../utils/db.js')

const Orm = require('../Orm')

class Calendar {
  static getForUser(user_id, brand_id, lo, hi) {
    return db.select('analytics/calendar/get', [
      user_id,
      brand_id,
      lo,
      hi
    ])
  }
}

Calendar.associations = {
  deal: {
    model: 'Deal',
    optional: true,
    enabled: false
  },
  crm_task: {
    model: 'CrmTask',
    optional: true,
    enabled: false
  },
  contact: {
    model: 'Contact',
    optional: true,
    enabled: false
  }
}

Orm.register('calendar_event', 'Calendar', Calendar)

module.exports = Calendar
