const ical = require('ical-generator')
const moment = require('moment')

const squel = require('../../utils/squel_extensions')
const db = require('../../utils/db.js')

const Orm = require('../Orm')

class Calendar {
  /**
   * @param {ICalendarFilter[]?} filter
   * @param {ICalendarFilterQuery} query 
   */
  static async filter(filter, query) {
    const { low, high, event_types, object_types, deal, contact } = query

    const q = squel.select()
      .field('*')
      .field('date', 'timestamp_readable')
      .field(squel.rstr('date + \'12 hours\'::interval'), 'timestamp_midday')
      .field('extract(epoch from "timestamp")', 'timestamp')
      .field(squel.rstr('\'calendar_event\''), 'type')
      .from('analytics.calendar')
      .where(squel.case().when('recurring IS True').then(
        squel.rstr('range_contains_birthday(to_timestamp($1), to_timestamp($2), "timestamp")')
      ).else(
        squel.rstr('"timestamp" BETWEEN to_timestamp($1) AND to_timestamp($2)')
      ))

    let arg_counter = 3

    if (Array.isArray(event_types) && event_types.length > 0)
      q.where(`event_type = ANY($${arg_counter++}::text[])`)

    if (Array.isArray(object_types) && object_types.length > 0)
      q.where(`object_type = ANY($${arg_counter++}::text[])`)

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

    if (deal) q.where(`deal = $${arg_counter++}`)
    if (contact) q.where(`contact = $${arg_counter++}`)

    q.order('analytics.calendar.timestamp')

    // @ts-ignore
    q.name = 'calendar/get'

    function* args() {
      yield low
      yield high

      if (Array.isArray(event_types) && event_types.length > 0)
        yield event_types

      if (Array.isArray(object_types) && object_types.length > 0)
        yield object_types

      if (!Array.isArray(filter)) return

      for (const f of filter) {
        if (f.brand) {
          yield f.brand
          if (Array.isArray(f.users)) {
            yield f.users
          }
        }
      }

      if (deal) yield deal
      if (contact) yield contact
    }

    const events = await db.select(q, Array.from(args()))

    return events
  }

  static _eventToIcalEvent(row) {
    const allDay = row.object_type !== 'crm_task'
    const date = moment(allDay ? row.timestamp_midday : row.timestamp_readable)
    if (date.year() === 1800) date.add(100, 'years')

    const DEFAULT_TIME_SPAN = 2

    const event = {
      start: date,
      end: allDay ? date.clone() : date.clone().add(DEFAULT_TIME_SPAN, 'hours'),
      summary: `${row.type_label} - ${row.title}`,
      description: row.title,
      location: '',
      url: '',
      allDay
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

    return event
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

    for (const row of result) {
      const event = Calendar._eventToIcalEvent(row)

      cal.createEvent(event)
    }

    return cal.toString()
  }

  static publicize(event) {
    delete event.user
    delete event.brand
  }
}

Calendar.associations = {
  crm_task: {
    model: 'CrmTask',
    enabled: false
  },
  deal: {
    model: 'Deal',
    enabled: false
  },
  contact: {
    model: 'Contact',
    enabled: false
  },
  campaign: {
    model: 'EmailCampaign',
    enabled: false
  }
}

Calendar.EVENT_TYPES = {
  BIRTHDAY: 'birthday'
}

Orm.register('calendar_event', 'Calendar', Calendar)

module.exports = Calendar
