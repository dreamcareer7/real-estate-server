const moment = require('moment-timezone')
const config = require('../../../../../../config')


const setTimezone = (ts, tz, type = null) => {
  const m = moment(ts * 1000)

  if ( type === 'birthday' ) {
    const currentYear = new Date().getFullYear()
    m.year(currentYear)
  }

  if (moment.tz.zone(tz)) {
    m.tz(tz)
  }

  return m
}

const getIsAllDay = (event) => {
  let allDay = (event.object_type === 'crm_task') ? false : true

  if ( event.full_crm_task && event.full_crm_task.metadata ) {
    if ( event.full_crm_task.metadata.all_day !== null ) {
      allDay = Boolean(event.full_crm_task.metadata.all_day)
    }
  }

  return allDay
}

const getDates = (event, timeZone, isAllDay) => {
  if ( !event.end_date ) {
    event.end_date = event.timestamp
  }

  // if ( event.timestamp < event.end_date ) {
  //   event.timestamp = event.end_date
  // }

  const start_date = setTimezone(event.timestamp, timeZone, event.event_type)
  let end_date     = setTimezone(event.end_date, timeZone)

  const start = { dateTime: start_date.format(), timeZone }
  const end   = { dateTime: end_date.format(), timeZone }

  if (isAllDay) {
    start_date.set('hour', 0)
    start_date.set('minute', 0)
    start_date.set('second', 0)
    start_date.set('millisecond', 0)

    end_date = start_date.clone()
    end_date.add(1, 'd')

    start.dateTime = start_date.format('YYYY-MM-DDTHH:mm:ss')
    end.dateTime   = end_date.format('YYYY-MM-DDTHH:mm:ss')
  }

  return {
    start_date,
    end_date,
    start,
    end
  }
}

const getRecurrence = (event, timeZone, start_date) => {
  let recurrence = null

  if (event.recurring) {
    recurrence = {
      pattern: {
        type: 'absoluteYearly',
        interval: 1,
        dayOfMonth: start_date.date(),
        month: start_date.month() + 1,
        firstDayOfWeek: 'sunday'
      },
      range: {
        type: 'numbered',
        startDate: start_date.format('YYYY-MM-DD'),
        numberOfOccurrences: 25,
        recurrenceTimeZone: timeZone
      }
    }
  }

  return recurrence
}

const getAttendees = (primaryEmail, event, isInitialSync) => {
  let attendees = []

  if (!isInitialSync && event.full_crm_task && event.full_crm_task.associations) {
    attendees = event.full_crm_task.associations.map(a => {
      if(a.contact) {
        const address = a.contact.primary_email || a.contact.email
        const name    = a.contact.display_name

        if ( address !== primaryEmail ) {
          return {
            emailAddress: { address, name },
            type: 'required'
          }
        }
      }
    })
  }

  attendees = attendees.slice(0, 100)

  return attendees
}

const getReminder = (event) => {
  let isReminderOn = false
  let reminderMinutesBeforeStart = 15

  if (event.full_crm_task && event.full_crm_task.reminders && event.full_crm_task.reminders.length) {
    const first = event.full_crm_task.reminders[0]
    
    isReminderOn = true
    reminderMinutesBeforeStart = Math.round((event.timestamp - first.timestamp) / 60)
  }

  return {
    isReminderOn,
    reminderMinutesBeforeStart
  }
}

const generateMicrosoftCalendarEvent = (credential, event, timeZone, isInitialSync) => {
  const isAllDay = getIsAllDay(event)
  const { start_date, start, end } = getDates(event, timeZone, isAllDay)
  const recurrence = getRecurrence(event, timeZone, start_date)
  const attendees  = getAttendees(credential.email, event, isInitialSync)
  const { isReminderOn, reminderMinutesBeforeStart } = getReminder(event)

  return {
    subject: (event.object_type === 'deal_context') ? `${event.type_label} for ${event.title}` : event.title,
    body: {
      contentType: 'HTML',
      content: event.full_crm_task ? event.full_crm_task.description : ''
    },

    start,
    end,
    isAllDay,

    attendees,

    isReminderOn,
    reminderMinutesBeforeStart,

    recurrence,

    extensions: [{
      '@odata.type': 'microsoft.graph.openTypeExtension',
      extensionName: config.microsoft_integration.openExtension.calendar.name,
      shared: true,
      origin: 'rechat',
      object_type: event.object_type,
      event_type: event.event_type,
      rechat_cal_event_id: event.id,
      rechat_cal_orginal_id: event.orginal_id || event.id
    }]
  }
}


module.exports = {
  generateMicrosoftCalendarEvent
}