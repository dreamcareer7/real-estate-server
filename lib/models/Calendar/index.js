const ical = require('ical-generator')
const moment = require('moment')

const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db.js')

const Orm = require('../Orm')

class Calendar {
  /**
   * @param {ICalendarFilter[]?} filter
   * @param {ICalendarFilterQuery} query 
   */
  static async filter(filter, query) {
    const { low, high, event_types, object_types, deal, contact } = query

    const q = sq.select()
      .field('*')
      .field('date', 'timestamp_readable')
      .field(sq.rstr('date + \'12 hours\'::interval'), 'timestamp_midday')
      .field('extract(epoch from "timestamp")', 'timestamp')
      .field(sq.rstr('\'calendar_event\''), 'type')
      .from('analytics.calendar')
      .where(sq.case().when('recurring IS True').then(
        sq.rstr('range_contains_birthday(to_timestamp(?), to_timestamp(?), "timestamp")', low, high)
      ).else(
        sq.rstr('"timestamp" BETWEEN to_timestamp(?) AND to_timestamp(?)', low, high)
      ))

    if (Array.isArray(event_types) && event_types.length > 0) {
      const positive_conds = event_types.filter(c => !c.startsWith('!'))
      const negative_conds = event_types.filter(c => c.startsWith('!')).map(c => c.substring(1))

      if (positive_conds.length > 0)
        q.where('event_type = ANY(?::text[])', sq.SqArray.from(positive_conds))

      if (negative_conds.length > 0)
        q.where('event_type <> ALL(?::text[])', sq.SqArray.from(negative_conds))
    }

    if (Array.isArray(object_types) && object_types.length > 0)
      q.where('object_type = ANY(?::text[])', sq.SqArray.from(object_types))

    if (Array.isArray(filter)) {
      const exp_filter = sq.expr()

      for (const f of filter) {
        if (f.brand) {
          const exp_f = sq.expr().and('brand = ?', f.brand)
          if (Array.isArray(f.users)) {
            exp_f.and('users && ?::uuid[]', sq.SqArray.from(f.users))
          }

          exp_filter.or(exp_f)
        }
      }

      q.where(exp_filter)
    }

    if (deal) q.where('deal = ?', deal)
    if (contact) q.where('contact = ?', contact)

    q.order('analytics.calendar.timestamp')

    // @ts-ignore
    q.name = 'calendar/get'

    const events = await db.select(q)

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
  full_crm_task: {
    model: 'CrmTask',
    enabled: false,
    id(event, cb) {
      cb(null, event.crm_task)
    }
  },
  full_deal: {
    model: 'Deal',
    enabled: false,
    id(event, cb) {
      cb(null, event.deal)
    }
  },
  full_contact: {
    model: 'Contact',
    enabled: false,
    id(event, cb) {
      cb(null, event.contact)
    }
  },
  full_campaign: {
    model: 'EmailCampaign',
    enabled: false,
    id(event, cb) {
      cb(null, event.campaign)
    }
  },
  contact_summary: {
    model: 'ContactSummary',
    enabled: false,
    id(event, cb) {
      cb(null, event.contact)
    }
  }
}

Calendar.EVENT_TYPES = {
  BIRTHDAY: 'birthday'
}

Orm.register('calendar_event', 'Calendar', Calendar)

module.exports = Calendar
