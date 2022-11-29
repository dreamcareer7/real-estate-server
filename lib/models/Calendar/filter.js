/* eslint-disable no-else-return */
/* eslint no-fallthrough: ["error", { "commentPattern": "break[\\s\\w]*omitted" }] */

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
  showing_appointment: default_event_type_filter(['calendar.showing']),
  holiday: default_event_type_filter(['calendar.holiday']),

  email_campaign: default_event_type_filter(['calendar.email_campaign_executed', 'calendar.email_campaign_scheduled']),
  email_campaign_recipient: default_event_type_filter(['calendar.email_campaign_email_executed']),
  deal_context: default_event_type_filter(['calendar.home_anniversary', 'calendar.deal_context']),
}

/**
 * @param {import('@rechat/squel').PostgresSelect} q 
 * @param {number | undefined} low
 * @param {number | undefined} high 
 * @param {string} subview 
 */
function date_range_filter(q, low, high, subview) {
  const m_low = (typeof low === 'number') ? moment(low * 1000) : null
  const m_high = (typeof high === 'number') ? moment(high * 1000) : null

  if (!m_low && !m_high) return

  switch (subview) {
    case 'calendar.home_anniversary':
      // This is to prevent home anniversaries show up in the years before a
      // deal's closing date
      if (m_high) {
        q.where('date_part(\'year\', "date") <= ?', m_high.year())
      }
      // break omitted

    case 'calendar.contact_attribute':
      if (!m_low || !m_high) return

      const m_low_after_one_year = m_low.clone().add(1, 'year')
      if (m_low_after_one_year.isBefore(m_high)) {
        return
      }

      const d_low = (m_low.month() + 1) * 100 + m_low.date()
      const d_high = (m_high.month() + 1) * 100 + m_high.date()

      if (d_low < d_high) {
        q.where('indexable_month_day(date) BETWEEN ? AND ?', d_low, d_high)
      } else {
        q.where('NOT (indexable_month_day(date) BETWEEN ? AND ?)', (d_high + 1) % 1232, d_low - 1)
      }

      break

    default:
      if (m_low && m_high) {
        q.where('"timestamp" BETWEEN to_timestamp(?) AND to_timestamp(?)', m_low.unix(), m_high.unix())
      } else if (m_low) {
        q.where('"timestamp" >= to_timestamp(?)', m_low.unix())
      } else if (m_high) {
        q.where('"timestamp" <= to_timestamp(?)', m_high.unix())
      }
      break
  }
}

/**
 * @param {import('@rechat/squel').PostgresSelect} q 
 * @param {'rechat' | 'microsoft' | 'google'} origin 
 */
function crm_task_origin_filter(q, origin) {
  q.left_join('calendar_integration', 'ci', 'v.crm_task = ci.crm_task')
  if (origin === 'rechat') {
    q.where(sq.expr().or('ci.origin = ?', origin).or('ci.origin IS NULL'))
  } else {
    q.where('ci.origin = ?', origin)
  }
}

/**
 * @param {ICalendarFilter[]?} filter
 * @param {ICalendarFilterQuery} query 
 */
const filter = async (filter, query, parallel = DEFAULT_PARALLEL) => {
  // eslint-disable-next-line prefer-const
  let { low, high, event_types, object_types, deal, contact, last_updated_gt } = query
  if (low === undefined && high === undefined && last_updated_gt !== undefined) {
    low = last_updated_gt
  }

  const m_low = (typeof low === 'number') ? moment(low * 1000) : null
  const m_high = (typeof high === 'number') ? moment(high * 1000) : null

  const subviews = (object_types || Object.keys(OBJECT_TYPE_VIEW_MAP)).flatMap(obt => OBJECT_TYPE_VIEW_MAP[obt](event_types))

  const q = sq.select()
    .field('v.*')
    .field('v.timestamp', 'timestamp_readable')
    .field('v.people_len::int', 'people_len')
    .field(sq.rstr('v.date + \'12 hours\'::interval'), 'timestamp_midday')
    .field('extract(epoch from v."timestamp")', 'timestamp')
    .field('extract(epoch from v.end_date)', 'end_date')
    .field('extract(epoch from v.created_at)', 'created_at')
    .field('extract(epoch from v.updated_at)', 'updated_at')
    .field(sq.rstr('\'calendar_event\''), 'type')

  if (typeof last_updated_gt === 'number') {
    q.where('v.last_updated_at >= to_timestamp(?)', last_updated_gt)
  } else {
    q.where('v.deleted_at IS NULL')
    q.where('v.parent_deleted_at IS NULL')
  }

  if (query.users) {
    q.where('v.users && ?::uuid[]', sq.SqArray.from([query.users]))
  }

  if (query.accessible_to) {
    q.where(
      sq.expr()
        .or('v.accessible_to @> ?::uuid[]', sq.SqArray.from([query.accessible_to]))
        .or('v.accessible_to IS NULL')
    )
  } else {
    q.where('v.accessible_to IS NULL')
  }

  if (Array.isArray(event_types) && event_types.length > 0) {
    const positive_conds = event_types.filter(c => !c.startsWith('!'))
    const negative_conds = event_types.filter(c => c.startsWith('!')).map(c => c.substring(1))

    if (positive_conds.length > 0)
      q.where('v.event_type = ANY(?::text[])', sq.SqArray.from(positive_conds))

    if (negative_conds.length > 0)
      q.where('v.event_type <> ALL(?::text[])', sq.SqArray.from(negative_conds))
  }

  if (Array.isArray(query.ids)) {
    q.where('v.id = ANY(?::text[])', sq.SqArray.from(query.ids))
  }

  if (Array.isArray(filter)) {
    const exp_filter = sq.expr()

    for (const f of filter) {
      if (f.brand) {
        const exp_f = sq.expr().and('v.brand = ?', f.brand)
        if (Array.isArray(f.users)) {
          exp_f.and('v.users && ?::uuid[]', sq.SqArray.from(f.users))
        }

        exp_filter.or(exp_f)
      }
    }

    q.where(exp_filter)
  }

  if (deal) q.where('v.deal = ?', deal)
  if (contact) q.where('v.contact = ?', contact)

  if (query.limit) q.limit(query.limit)

  /**
   * If `low` is specified we sort in an ascending order, otherwise since only
   * an upper limit has been specified, we will order descendingly to get
   * events closest to the `high` limit. Regardless, events will be sorted
   * ascendingly when we merge the query results.
   */
  if (typeof low === 'number') {
    q.order('v.timestamp', true /* ASCENDING */)
  } else if (typeof high === 'number') {
    q.order('v.timestamp', false /* DESENDING */)
  }

  const events = await Promise.all(subviews.map(async view => {
    const sub_q = q.clone().from(view, 'v')
    date_range_filter(sub_q, low, high, view)
    if (view === 'calendar.crm_task' && query.origin) {
      crm_task_origin_filter(sub_q, query.origin)
    }

    // @ts-ignore
    sub_q.name = `calendar/get/${view}`

    if (parallel) {
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
    } else {
      return await db.select(sub_q)
    }
  }))

  const md_low = m_low ? m_low.month() * 100 + m_low.date() : undefined
  const md_high = m_high ? m_high.month() * 100 + m_high.date() : undefined

  /**
   * Adds date and fixes years on recurring events according to low and high
   * @param {{ timestamp: number; recurring: boolean; }} ev 
   * @returns {{ timestamp: number; recurring: boolean; sort_timestamp: number; }}
   */
  const addSortTimestamp = (ev) => {
    if (!ev.recurring) {
      return { ...ev, sort_timestamp: ev.timestamp }
    }

    const d = new Date(ev.timestamp * 1000)
    const md_d = d.getMonth() * 100 + d.getDate()
    if (md_low && m_low && d.getTime() < m_low.valueOf()) {
      // reset year to low's year. if month and date is _before_ low's month
      // and date, it means the query hasn't found any thing for this year so
      // it's gone ahead into the next years. So we add 1 year.
      d.setFullYear(m_low.year() + (md_d < md_low ? 1 : 0))
    } else if (md_high && m_high) {
      // reset year to high's year. if month and date is _before_ high's month
      // and date, it means the query hasn't found any thing for this year so
      // it's gone ahead into the previous years. So we subtract 1 year.
      d.setFullYear(m_high.year() - (md_d > md_high ? 1 : 0))
    }

    return { ...ev, sort_timestamp: d.getTime() / 1000 }
  }

  const merged = _.sortBy(events.flat(1).map(addSortTimestamp), 'sort_timestamp')

  if (typeof query.limit === 'number' && typeof low === 'number') {
    return _.take(merged, query.limit)
  } else if (typeof query.limit === 'number') {
    return _.takeRight(merged, query.limit)
  }

  return merged
}

module.exports = {
  filter,
}
