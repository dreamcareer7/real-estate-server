const squel = require('../../utils/squel_extensions')
const db = require('../../utils/db.js')

const Orm = require('../Orm')
const contexts = require('../Deal/context/all')

class Calendar {
  /**
   * @param {ICalendarFilter[]?} filter
   * @param {any} query 
   */
  static async filter(filter, query) {
    const { low, high, event_types } = query

    const q = squel.select()
      .field('*')
      .field('timestamp', 'timestamp_readable')
      .field('extract(epoch from "timestamp")', 'timestamp')
      .field(squel.rstr('\'calendar_event\''), 'type')
      .from('analytics.calendar')
      .where(squel.case().when('recurring IS True').then(
        squel.rstr('range_contains_birthday(to_timestamp($1), to_timestamp($2), "timestamp")')
      ).else(
        squel.rstr('"timestamp" BETWEEN to_timestamp($1) AND to_timestamp($2)')
      ))

    let arg_counter = 3

    if (Array.isArray(event_types)) {
      q.where(`event_type = ANY($${arg_counter++}::text[])`)
    }

    if (Array.isArray(filter)) {
      const exp_filter = squel.expr()

      for (const f of filter) {
        const exp_f = squel.expr().and(`brand = $${arg_counter++}`)
        if (Array.isArray(f.users)) {
          exp_f.and(`users && $${arg_counter++}::uuid[]`)
        }

        exp_filter.or(exp_f)
      }

      q.where(exp_filter)
    }

    q.name = 'calendar/get'

    function* args() {
      yield low
      yield high

      if (Array.isArray(event_types)) {
        yield event_types
      }
        
      if (!Array.isArray(filter)) return

      for (const f of filter) {
        yield f.brand
        if (Array.isArray(f.users)) {
          yield f.users
        }
      }
    }

    const events = await db.select(q, Array.from(args()))

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
