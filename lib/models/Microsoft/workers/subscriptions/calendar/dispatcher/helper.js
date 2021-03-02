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
  if ( event.all_day !== null ) {
    return event.all_day
  }

  // fallback for crm_task and old events
  let allDay = (event.object_type === 'crm_task') ? false : true

  if ( event.full_crm_task && event.full_crm_task.metadata ) {
    if ( event.full_crm_task.all_day !== null ) {
      allDay = Boolean(event.full_crm_task.all_day)
    }
  }

  return allDay
}

const getRecurrence = (event, timeZone, start_date) => {
  let recurrence = null

  if (event.recurring) {
    const startDate = start_date.format('YYYY-MM-DD')
    const startDateArr = startDate.split('-')

    recurrence = {
      pattern: {
        type: 'absoluteYearly',
        interval: 1,
        dayOfMonth: startDateArr[2],
        month: startDateArr[1],
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

const getDates = (event, timeZone, isAllDay) => {
  const start = { timeZone }
  const end = { timeZone }

  if ( !event.end_date ) {
    event.end_date = event.timestamp
  }

  let start_date = setTimezone(event.timestamp, timeZone, event.event_type)
  let end_date   = setTimezone(event.end_date, timeZone, event.event_type)

  if (isAllDay) {
    start_date = start_date.tz('GMT')
    end_date   = end_date.tz('GMT')

    if ( event.end_date === event.timestamp ) {
      end_date = end_date.add(1, 'days')
    }
  }

  // ({date}T{time}; for example, 2017-08-29T04:00:00.0000000).
  start.dateTime = start_date.format('YYYY-MM-DDTHH:mm:ss')
  end.dateTime   = end_date.format('YYYY-MM-DDTHH:mm:ss')

  // if (isAllDay) {
  //   start.dateTime = start.dateTime.slice(0,10)
  //   end.dateTime   = end.dateTime.slice(0,10)
  // }

  const recurrence = getRecurrence(event, timeZone, start_date)

  return {
    recurrence,
    start,
    end
  }
}

const getAttendees = (primaryEmail, event, isInitialSync) => {
  let attendees = []

  if ( !event.full_crm_task?.metadata?.send_updates ) {
    return attendees
  }

  if (!isInitialSync && event?.full_crm_task?.associations) {

    attendees = event.full_crm_task.associations
      .filter(a => a.contact)
      .filter(a => {
        const address = a.contact.primary_email || a.contact.email
        if ( address !== primaryEmail ) {
          return true
        }
      })
      .map(a => {
        const address = a.contact.primary_email || a.contact.email
        const name    = a.contact.display_name

        return {
          emailAddress: { address, name },
          type: 'optional'
        }
      })
  }

  return attendees.slice(0, 100)
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
  const { recurrence, start, end } = getDates(event, timeZone, isAllDay)
  const attendees = getAttendees(credential.email, event, isInitialSync)
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
    responseRequested: false,

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