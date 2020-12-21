/* eslint-disable no-else-return */

const _ = require('lodash')
const moment = require('moment')

const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db.js')

const DEFAULT_PARALLEL = process.env.NODE_ENV === 'tests' ? false : true

const default_event_type_filter = view_names => _event_types => view_names

const OBJECT_TYPE_VIEW_MAP = {
  contact: default_event_type_filter(['calendar.contact']),
  contact_attribute: default_event_type_filter(['calendar.contact_attribute']),
  crm_task: default_event_type_filter(['calendar.crm_task']),
  crm_association: default_event_type_filter(['calendar.crm_association']),
  email_thread: default_event_type_filter(['calendar.email_thread']),
  email_thread_recipient: default_event_type_filter(['calendar.email_thread_recipient']),
  activity: default_event_type_filter(['calendar.activity']),
  flow: default_event_type_filter(['calendar.flow']),

  email_campaign: default_event_type_filter(['calendar.email_campaign_executed', 'calendar.email_campaign_scheduled']),
  email_campaign_email: default_event_type_filter(['calendar.email_campaign_email_executed']),
  deal_context: default_event_type_filter(['calendar.home_anniversary', 'calendar.deal_context']),
}

/**
 * @param {import('@rechat/squel').PostgresSelect} q 
 * @param {number | undefined} low
 * @param {number | undefined} high 
 * @param {string} subview 
 */
function date_range_filter(q, low, high, subview) {
  if (!low && !high) return

  const m_low = (typeof low === 'number') ? moment(low * 1000) : moment(high * 1000).add(-1, 'year')
  const m_high = (typeof high === 'number') ? moment(high * 1000) : moment(low * 1000).add(1, 'year')

  if (typeof low === 'number' && typeof high === 'number') {
    switch (subview) {
      case 'calendar.home_anniversary':
      case 'calendar.contact_attribute':
        const d_low = (m_low.month() + 1) * 100 + m_low.date()
        const d_high = (m_high.month() + 1) * 100 + m_high.date()

        if (d_low < d_high) {
          q.where('indexable_month_day(date) BETWEEN ? AND ?', d_low, d_high)
        } else {
          q.where('NOT (indexable_month_day(date) BETWEEN ? AND ?)', (d_high + 1) % 1232, d_low - 1)
        }

        break

      default:
        q.where('"timestamp" BETWEEN to_timestamp(?) AND to_timestamp(?)', m_low.unix(), m_high.unix())
        break
    }
  }
}

/**
 * @param {ICalendarFilter[]?} filter
 * @param {ICalendarFilterQuery} query 
 */
const filter = async (filter, query, parallel = DEFAULT_PARALLEL) => {
  // eslint-disable-next-line prefer-const
  let { low, high, event_types, object_types, deal, contact, last_updated_gt } = query

  const subviews = (object_types || Object.keys(OBJECT_TYPE_VIEW_MAP)).flatMap(obt => OBJECT_TYPE_VIEW_MAP[obt](event_types))

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

  if (typeof last_updated_gt === 'number') {
    q.where('last_updated_at >= to_timestamp(?)', last_updated_gt)
  } else {
    q.where('deleted_at IS NULL')
    q.where('parent_deleted_at IS NULL')
  }

  if (query.users) {
    q.where('users && ?::uuid[]', sq.SqArray.from([query.users]))
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

  if (query.limit) q.limit(query.limit)

  if (parallel) {
    const events = await Promise.all(subviews.map(async view => {
      const sub_q = q.clone().from(view)
      date_range_filter(sub_q, low, high, view)

      // @ts-ignore
      sub_q.name = `calendar/get/${view}`

      const { conn, done } = await db.conn.promise()
      try {
        await conn.query('BEGIN')
        return await db.select(sub_q, undefined, conn)
      } catch (ex) {
        conn.query('ROLLBACK')
        throw ex
      } finally {
        done()
      }
    }))

    return _.sortBy(events.flat(1), 'timestamp')
  } else {
    const unioned_q = subviews.slice(1).map(view => sq.select().from(view)).reduce((rq, subq) => rq.union_all(subq), sq.select().from(subviews[0]))
    q.from(unioned_q, 't_union')
    q.order('t_union.timestamp')

    const m_low = (typeof low === 'number') ? moment(low * 1000) : moment(high * 1000).add(-1, 'year')
    const m_high = (typeof high === 'number') ? moment(high * 1000) : moment(low * 1000).add(1, 'year')
  
    const d_low = (m_low.month() + 1) * 100 + m_low.date()
    const d_high = (m_high.month() + 1) * 100 + m_high.date()

    q.where(sq.case().when('recurring IS True AND ? < ?', d_low, d_high).then(
      sq.rstr('indexable_month_day("date") BETWEEN ? AND ?', d_low, d_high)
    ).when('recurring IS True AND ? >= ?', d_low, d_high).then(
      sq.rstr('NOT (indexable_month_day("date") BETWEEN ? AND ?)', (d_high + 1) % 1232, d_low - 1)
    ).else(
      sq.rstr('"timestamp" BETWEEN to_timestamp(?) AND to_timestamp(?)', m_low.unix(), m_high.unix())
    ))

    return db.select(q)
  }
}

module.exports = {
  filterParallel: filter,
}
