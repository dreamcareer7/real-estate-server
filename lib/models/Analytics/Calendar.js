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
      event.event_type = contexts[event.event_type].label

    delete event.user
    delete event.brand
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
