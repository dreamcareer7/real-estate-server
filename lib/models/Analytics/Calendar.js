const db = require('../../utils/db.js')

const Orm = require('../Orm')
const contexts = require('../Deal/context/all')

class Calendar {
  /**
   * 
   * @param {UUID[] | null} user_ids 
   * @param {UUID=} brand_id 
   * @param {any} query 
   */
  static async filter(user_ids, brand_id, query) {
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      user_ids = null
    }

    const { low, high, event_types } = query

    const events = await db.select('analytics/calendar/get', [
      user_ids,
      brand_id,
      low,
      high,
      event_types
    ])

    return events.filter(ev => ev.object_type !== 'deal_context' || contexts.hasOwnProperty(ev.event_type))
  }

  static publicize(event) {
    if (event.object_type === 'deal_context') {
      event.type_label = contexts[event.event_type].label
    }

    delete event.user
    delete event.brand
  }
}

Calendar.EVENT_TYPES = {
  BIRTHDAY: 'birthday'
}

Orm.register('calendar_event', 'Calendar', Calendar)

module.exports = Calendar
