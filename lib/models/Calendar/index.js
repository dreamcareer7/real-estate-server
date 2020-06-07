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
    // eslint-disable-next-line prefer-const
    let { low, high, event_types, object_types, deal, contact, last_updated_gt } = query

    const q = sq.select()
      .field('*')
      .field('date', 'timestamp_readable')
      .field('people_len::int', 'people_len')
      .field(sq.rstr('date + \'12 hours\'::interval'), 'timestamp_midday')
      .field('extract(epoch from "timestamp")', 'timestamp')
      .field('extract(epoch from end_date)', 'end_date')
      .field('extract(epoch from created_at)', 'created_at')
      .field('extract(epoch from updated_at)', 'updated_at')
      .field(sq.rstr('\'calendar_event\''), 'type')
      .from('analytics.calendar')

    if (typeof low === 'number' && typeof high === 'number') {
      q.where(sq.case().when('recurring IS True').then(
        sq.rstr('range_contains_birthday(to_timestamp(?), to_timestamp(?), "timestamp")', low, high)
      ).else(
        sq.rstr('"timestamp" BETWEEN to_timestamp(?) AND to_timestamp(?)', low, high)
      ))
    } else if (typeof low === 'number') {
      high = moment(low).add(1, 'year').unix()
      q.where(sq.case().when('recurring IS True').then(
        sq.rstr('range_contains_birthday(to_timestamp(?), to_timestamp(?), "timestamp")', low, high)
      ).else(
        sq.rstr('"timestamp" >= to_timestamp(?)', low)
      ))
    } else if (typeof high === 'number') {
      low = moment(high).add(-1, 'year').unix()
      q.where(sq.case().when('recurring IS True').then(
        sq.rstr('range_contains_birthday(to_timestamp(?), to_timestamp(?), "timestamp")', low, high)
      ).else(
        sq.rstr('"timestamp" <= to_timestamp(?)', high)
      ))
    }

    if (typeof last_updated_gt === 'number') {
      q.where('last_updated_at >= to_timestamp(?)', last_updated_gt)
    } else {
      q.where('deleted_at IS NULL')
      q.where('parent_deleted_at IS NULL')
    }

    if (query.users) {
      q.where('users @> ?::uuid[]', sq.SqArray.from([query.users]))
    }

    if (query.accessible_to) {
      q.where(
        sq.expr()
          .or('accessible_to @> ?::uuid[]', sq.SqArray.from([query.accessible_to]))
          .or('accessible_to IS NULL')
      )
    } else {
      q.where('accessible_to IS NULL')
    }

    if (Array.isArray(event_types) && event_types.length > 0) {
      const positive_conds = event_types.filter(c => !c.startsWith('!'))
      const negative_conds = event_types.filter(c => c.startsWith('!')).map(c => c.substring(1))

      if (positive_conds.length > 0)
        q.where('event_type = ANY(?::text[])', sq.SqArray.from(positive_conds))

      if (negative_conds.length > 0)
        q.where('event_type <> ALL(?::text[])', sq.SqArray.from(negative_conds))
    }

    if (Array.isArray(query.ids)) {
      q.where('id = ANY(?::text[])', sq.SqArray.from(query.ids))
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

    if (query.limit) q.limit(query.limit)

    // @ts-ignore
    q.name = 'calendar/get'

    const events = await db.select(q)

    return events
  }

  static publicize(event) {
    delete event.user
    delete event.brand
  }
}

Calendar.associations = {
  people: {
    // Items will be either Contact or Agent
    polymorphic: true,
    enabled: false,
    collection: true
  },
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
  activity: {
    model: 'Activity',
    enabled: false
  },
  full_thread: {
    model: 'EmailThread',
    enabled: false,
    id(event, cb) {
      cb(null, event.thread_key)
    }
  }
}

Orm.register('calendar_event', 'Calendar', Calendar)

module.exports = Calendar
