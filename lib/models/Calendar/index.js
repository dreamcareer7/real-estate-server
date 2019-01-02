const ical = require('ical-generator')
const moment = require('moment')

const squel = require('../../utils/squel_extensions')
const db = require('../../utils/db.js')

const Orm = require('../Orm')

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
        if (f.brand) {
          const exp_f = squel.expr().and(`brand = $${arg_counter++}`)
          if (Array.isArray(f.users)) {
            exp_f.and(`users && $${arg_counter++}::uuid[]`)
          }

          exp_filter.or(exp_f)
        }
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
        if (f.brand) {
          yield f.brand
          if (Array.isArray(f.users)) {
            yield f.users
          }
        }
      }
    }

    const events = await db.select(q, Array.from(args()))

    return events
  }

  static async getAsICal(filter, query, timezone) {
    const events = await Calendar.filter(filter, query)
    const result = await Orm.populate({ models: events })
  
    const cal = ical({
      domain: 'rechat.com',
      name: 'Your events on Rechat',
      prodId: {company: 'rechat.com', product: 'Rechat CRM'},
      timezone: timezone
    })
  
    const TTL = 60 * 15 // 15 minutes
    cal.ttl(TTL)
    let event

    for (const row of result) {
      const date = moment(row.timestamp_readable)
      const DEFAULT_TIME_SPAN = 2
      event = {
        start: row.timestamp_readable,
        end: new Date(date.add(DEFAULT_TIME_SPAN, 'hours')),
        summary: `${row.type_label} - ${row.title}`,
        description: row.title,
        location: '',
        url: '',
        allDay: row.object_type !== 'crm_task'
      }

      if (row.event_type === Calendar.EVENT_TYPES.BIRTHDAY) {
        event.summary = `${row.title}'s birthday`
      }
  
      if (row.object_type === 'contact_attribute') {
        event.repeating = {
          freq: 'YEARLY',
          count: 150
        }
      }

      cal.createEvent(event)
    }

    return cal.toString()
  }

  static publicize(event) {
    delete event.user
    delete event.brand
  }
}

Calendar.EVENT_TYPES = {
  BIRTHDAY: 'birthday'
}

Orm.register('calendar_event', 'Calendar', Calendar)

module.exports = Calendar
