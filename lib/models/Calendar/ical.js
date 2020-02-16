const ical   = require('ical-generator')
const moment = require('moment')

const Calendar = require('./index')
const Orm = require('../Orm')

function _eventToIcalEvent(row) {
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

  if (row.event_type === 'birthday') {
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

/**
 * @param {ICalendarFilter[]?} filter
 * @param {ICalendarFilterQuery} query 
 * @param {string} timezone
 */
async function getAsICal(filter, query, timezone) {
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
    const event = _eventToIcalEvent(row)

    cal.createEvent(event)
  }

  return cal.toString()
}

module.exports = getAsICal
