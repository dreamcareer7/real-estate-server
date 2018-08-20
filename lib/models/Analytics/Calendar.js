const db = require('../../utils/db.js')

const Orm = require('../Orm')
const contexts = require('../Deal/context/all')

class Calendar {
  /**
   * 
   * @param {UUID} user_id 
   * @param {UUID} brand_id 
   * @param {number} lo 
   * @param {number} hi 
   * @param {string[]=} event_type Filter 
   */
  static async getForUser(user_id, brand_id, lo, hi, event_type) {
    const events = await db.select('analytics/calendar/get', [
      user_id,
      brand_id,
      lo,
      hi,
      event_type
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
