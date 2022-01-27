const ical   = require('ical-generator')
const moment = require('moment')

const Calendar = require('./index')
const Orm = require('../Orm/index')

function _eventToIcalEvent(row) {
  
  const allDay = row.all_day
  const createdDate = moment(row.created_at * 1000)
  const startDate = moment(row.timestamp_readable)
  const endDate = moment(row.end_date * 1000)
  
  if (startDate.year() === 1800) startDate.add(100, 'years')

  const event = {
    stamp: createdDate,
    start: startDate,
    end: allDay ? startDate.clone() : endDate,
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
