const ical = require('ical-generator')
const moment = require('moment')

const promisify = require('../../utils/promisify')

const Calendar = require('.')
const User = require('../User')

async function exportAsFeed(user_id, httpResponse, result) {
  const user = await promisify(User.get)(user_id)

  const cal = ical({
    domain: 'rechat.com',
    name: 'Your events on Rechat',
    prodId: {company: 'rechat.com', product: 'Rechat CRM'},
    timezone: user.timezone
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
      url: ''
    }

    event.allDay = row.object_type !== 'crm_task'

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

  cal.serve(httpResponse)
}

module.exports = {
  exportAsFeed
}
