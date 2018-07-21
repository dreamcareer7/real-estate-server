const ical = require('ical-generator')
const moment = require('moment')

async function exportAsFeed(httpResponse, result) {
  const cal = ical({
    domain: 'rechat.com',
    name: 'Your events on Rechat',
    prodId: {company: 'rechat.com', product: 'Rechat CRM'}
  })
  cal.ttl(60 * 60 * 24) // One day ttl
  let event
  
  for (const row of result) {
    const date = moment(row.timestamp_readable)
    const DEFAULT_TIME_SPAN = 2
    event = {
      start: row.timestamp_readable,
      end: new Date(date.add(DEFAULT_TIME_SPAN, 'hours')),
      summary: row.title,
      description: row.type_label,
      location: '',
      url: ''
    }
    
    if (row.event_type === 'birthday') {
      event.allDay = true
      event.summary = `${row.title}'s birthday`
      const createdEvent = cal.createEvent(event)
      
      createdEvent.repeating({
        freq: 'YEARLY',
        count: 150
      })
      
      cal.createEvent(event)
      continue
    }

    cal.createEvent(event)
  }

  cal.serve(httpResponse)
}

module.exports = {
  exportAsFeed
}