const _ = require('lodash')
const moment = require('moment-timezone')
const config = require('../../../../../config')

const CalendarIntegration    = require('../../../../CalendarIntegration')
const MicrosoftCalendarEvent = require('../../../calendar_events')
const MicrosoftCalendar      = require('../../../calendar')
const CrmTask = require('../../../../CRM/Task/index')
// const Context = require('../../../Context')

const _REASON     = config.microsoft_integration.crm_task_update_reason
const objectTypes = ['crm_task', 'contact_attribute', 'deal_context']


const pruneDeletedMicrosoftEvents = async (credential, records) => {
  if ( records.length === 0 ) {
    return
  }

  const recordIds    = records.map(r => r.id)
  const microsoftIds = records.filter(r => r.crm_task).map(r => r.microsoft_id)
  const crmTaskIds   = records.filter(r => r.crm_task).map(r => r.crm_task)
  
  // Context.log('---- pruneDeletedMicrosoftEvents recordIds', recordIds)
  // Context.log('---- pruneDeletedMicrosoftEvents microsoftIds', microsoftIds)
  // Context.log('---- pruneDeletedMicrosoftEvents crmTaskIds', crmTaskIds)

  await CalendarIntegration.deleteMany(recordIds)
  await MicrosoftCalendarEvent.deleteMany(microsoftIds)
  await CrmTask.remove(crmTaskIds, credential.user, _REASON)
}

const pruneOffTrackRechatEvents = async (records) => {
  if ( records.length === 0 ) {
    return
  }

  const recordIds = records.map(r => r.id)
  const microsoftIds = records.map(r => r.microsoft_id)
  
  // Context.log('---- pruneOffTrackRechatEvents recordIds', recordIds)
  // Context.log('---- pruneOffTrackRechatEvents microsoftIds', microsoftIds)

  await CalendarIntegration.deleteMany(recordIds)
  await MicrosoftCalendarEvent.deleteMany(microsoftIds)
}

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

  let start_date = event.timestamp
  let end_date   = event.end_date

  start_date = setTimezone(start_date, timeZone, event.event_type)
  end_date   = setTimezone(end_date, timeZone)

  if (isAllDay) {
    end_date = start_date.clone()
    end_date.add(1, 'd')
  }

  const start = {
    dateTime: start_date.format(),
    timeZone: timeZone
  }

  const end = {
    dateTime: end_date.format(),
    timeZone: timeZone
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

  // How about other critical dates of contacts ???
  if ( event.event_type === 'birthday' ) {
    recurrence = {
      pattern: {
        type: 'absoluteYearly',
        interval: 1,
        dayOfMonth: start_date.date(),
        month: start_date.month() + 1
      },
      range: {
        type: 'numbered',
        startDate: start_date.format('YYYY-MM-DD'),
        numberOfOccurrences: 3,
        recurrenceTimeZone: timeZone
      }
    }
  }

  return recurrence
}

const getAttendees = (event, isInitialSync) => {
  let attendees = []

  if (!isInitialSync && event.full_crm_task && event.full_crm_task.associations) {
    attendees = event.full_crm_task.associations.map(a => {
      if(a.contact) {
        return {
          emailAddress: {
            address: a.contact.primary_email || a.contact.email,
            name: a.contact.display_name
          },
          type: 'required'
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
    reminderMinutesBeforeStart = Math.round(((first.timestamp * 1000) - (new Date().getTime())) / 1000 / 60)
  }

  return {
    isReminderOn,
    reminderMinutesBeforeStart
  }
}

const generateMicrosoftCalendarEvent = (event, timeZone, isInitialSync) => {
  const isAllDay = getIsAllDay(event)
  const { start_date, start, end } = getDates(event, timeZone, isAllDay)
  const recurrence = getRecurrence(event, timeZone, start_date)
  const attendees  = getAttendees(event, isInitialSync)
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

    recurrence

    // extendedProperties: {
    //   shared: {
    //     origin: 'rechat',
    //     object_type: event.object_type,
    //     event_type: event.event_type,
    //     rechat_cal_event_id: event.id,
    //     rechat_cal_orginal_id: event.orginal_id || event.id
    //   }
    // }
  }
}

const refineIntegrationRecords = async (events) => {
  const crmTaskIds         = events.filter(e => e.object_type === 'crm_task').map(e => e.id)
  const contactIds         = events.filter(e => e.object_type === 'contact').map(e => e.id)
  const contactAttIds      = events.filter(e => e.object_type === 'contact_attribute').map(e => e.id)
  const dealContextIds     = events.filter(e => (e.object_type === 'deal_context' && e.event_type !== 'home_anniversary' )).map(e => e.id)
  const homeAnniversaryIds = events.filter(e => (e.object_type === 'deal_context' && e.event_type === 'home_anniversary' )).map(e => e.id)

  const crmTasksIntRecords          = await CalendarIntegration.getByCrmTasks(crmTaskIds)
  const contactsIntRecords          = await CalendarIntegration.getByContacts(contactIds)
  const contactAttsIntRecords       = await CalendarIntegration.getByContactAttributes(contactAttIds)
  const dealContextsIntRecords      = await CalendarIntegration.getByDealContexts(dealContextIds)
  const homeAnniversariesIntRecords = await CalendarIntegration.getByHomeAnniversaries(homeAnniversaryIds)

  const microsoftCalendarEventIds = new Set()

  for (const event of events) {
    if ( event.object_type === 'crm_task' ) {
      event.integrations = crmTasksIntRecords.filter(record => (event.id === record.crm_task && record.microsoft_id))
    }

    if ( event.object_type === 'contact' ) {
      event.integrations = contactsIntRecords.filter(record => (event.id === record.contact && record.microsoft_id))
    }

    if ( event.object_type === 'contact_attribute' ) {
      event.integrations = contactAttsIntRecords.filter(record => (event.id === record.contact_attribute && record.microsoft_id))
    }

    if ( event.object_type === 'deal_context' && event.event_type !== 'home_anniversary' ) {
      event.integrations = dealContextsIntRecords.filter(record => (event.id === record.deal_context && event.contact === null && record.microsoft_id))
    }

    if ( event.object_type === 'deal_context' && event.event_type === 'home_anniversary' ) {
      event.integrations = homeAnniversariesIntRecords.filter(record => (event.id === record.deal_context && event.contact === record.contact && record.microsoft_id))
    }

    event.integrations.forEach(function(record) {
      if (record.microsoft_id) {
        microsoftCalendarEventIds.add(record.microsoft_id)
      }
    })
  }

  const microsoftCalEvents = await MicrosoftCalendarEvent.getAll(Array.from(microsoftCalendarEventIds))
  const microsoftCalIds    = [...new Set(microsoftCalEvents.map(e => e.microsoft_calendar))]
  const microsoftCalendars = await MicrosoftCalendar.getAll(microsoftCalIds)


  return {
    microsoftCalEventsById: _.keyBy(microsoftCalEvents, 'id'),
    microsoftCalendarsById: _.keyBy(microsoftCalendars, 'id')
  }
}


const refineEvents = async (credential, calEvents, timeZone, isInitialSync) => {
  let events_level_1  = []
  let events_level_2  = []

  const created = []
  const updated = []
  const deleted = []

  // level #1 refine
  for (const event of calEvents) {
    if ( !objectTypes.includes(event.object_type) ) {
      continue
    } 

    if ( event.object_type === 'deal_context' && event.event_type === 'home_anniversary' ) {
      event.orginal_id = event.id
      event.id = event.id.split(':')[1]
    }

    events_level_1.push(event)
  }

  const { microsoftCalEventsById, microsoftCalendarsById } = await refineIntegrationRecords(events_level_1)

  // level #2 refine (exclude events of deleted calendars in side of microsoft)
  for (const event of events_level_1) {
    // Pass newly created events
    if ( event.integrations.length === 0 ) {
      events_level_2.push(event)
      continue
    }

    for (const record of event.integrations) {      
      const microsoftCalEvent = microsoftCalEventsById[record.microsoft_id]
      const microsoftCal      = microsoftCalendarsById[microsoftCalEvent.microsoft_calendar]

      if ( !microsoftCal.deleted_at ) {
        record.microsoftCalEvent = microsoftCalEvent
        record.microsoftCal      = microsoftCal
        events_level_2.push(event)
      } else {
        continue
      }
    }
  }

  // level #3 refine
  for (const event of events_level_2) {
    event.timeZone = timeZone
    event.resource = generateMicrosoftCalendarEvent(event, timeZone, isInitialSync)

    if ( event.deleted_at && event.integrations && event.integrations.length === 0 ) {
      continue
    }

    if ( event.deleted_at || event.parent_deleted_at ) {
      for (const record of event.integrations) {
        if ( record.microsoftCal.microsoft_credential === credential.id ) {
          event.integrations = [record]
  
          deleted.push(event)
          break
        }
      }

      continue
    }

    if ( event.integrations.length === 0 ) {
      created.push(event)
      continue
    }

    let isUpdated = false

    for (const record of event.integrations) {
      if ( record.microsoftCal.microsoft_credential === credential.id ) {
        isUpdated = true

        if ( record.etag === record.local_etag ) {
          break
        }

        event.integrations = [record]

        updated.push(event)
        break
      }
    }

    if (!isUpdated) {
      created.push(event)
    }
  }

  // flush memory
  events_level_1 = []
  events_level_2 = []

  return {
    created,
    updated,
    deleted
  }
}

const handleCreatedEvents = async (credential, events) => {  
  const calendar = await MicrosoftCalendar.get(credential.microsoft_calendar)
  
  let counter = 1

  // const eventsByOrgId = _.keyBy(events, 'orginal_id')
  // const eventsById    = _.keyBy(events, 'id')

  const remoteEvents  = events.map(e => ({
    requestId: counter++,
    calendarId: calendar.calendar_id,
    resource: e.resource,
    timeZone: e.timeZone,
    sendUpdates: e.resource.sendUpdates
  }))

  const { microsoftCalEvents, error } = await MicrosoftCalendarEvent.batchInsert(credential, calendar, remoteEvents)
  console.log('--- microsoftCalEvents', microsoftCalEvents)

  // if (microsoftCalEvents) {
  //   const records = microsoftCalEvents.map(record => {
      
  //     let event = eventsById[record.extended_properties.shared.rechat_cal_event_id]

  //     if ( record.extended_properties.shared.object_type === 'deal_context' && record.extended_properties.shared.event_type === 'home_anniversary' ) {
  //       event = eventsByOrgId[record.extended_properties.shared.rechat_cal_orginal_id]
  //     }

  //     return {
  //       microsoft_id: record.id,
  //       google_id: null,

  //       crm_task: (event.object_type === 'crm_task') ? event.id : null,
  //       contact: (event.object_type === 'deal_context' && event.event_type === 'home_anniversary') ? event.contact : ((event.object_type === 'contact') ? event.id : null),
  //       contact_attribute: (event.object_type === 'contact_attribute') ? event.id : null,
  //       deal_context: (event.object_type === 'deal_context') ? event.id : null,

  //       object_type: event.object_type,
  //       event_type: event.event_type,
  //       origin: 'rechat',
  //       etag: record.etag,
  //       local_etag: record.etag
  //     }
  //   })
  
  //   const result = await CalendarIntegration.insert(records)
  
  //   return {
  //     result
  //   }
  // }

  return {
    error
  }
}

const handleUpdatedEvents = async (credential, events) => {
  const remoteEvents = events.map(e => ({
    cid: e.integrations[0].id,
    eventId: e.integrations[0].microsoftCalEvent.event_id,
    calendar: e.integrations[0].microsoftCal,
    timeZone: e.timeZone,
    sendUpdates: e.resource.sendUpdates,
    resource: e.resource
  }))

  const { microsoftCalEvents, failedIntegrations, error } = await MicrosoftCalendarEvent.batchUpdate(credential, remoteEvents)

  if (microsoftCalEvents) {
    const toUpdateCalIntRecords = microsoftCalEvents.map(event => ({
      microsoft_id: event.id,
      etag: event.changeKey,
      local_etag: event.changeKey,
      crm_task: null
    }))

    const result = await CalendarIntegration.gupsert(toUpdateCalIntRecords)

    if ( failedIntegrations && failedIntegrations.length > 0 ) {
      const records = await CalendarIntegration.getAll(failedIntegrations)

      const byMicrosoft = records.filter(r => (r.origin === 'microsoft'))
      const byRechat = records.filter(r => (r.origin === 'rechat'))

      await pruneDeletedMicrosoftEvents(credential, byMicrosoft)
      await pruneOffTrackRechatEvents(byRechat)
    }

    return {
      result
    }
  }

  return {
    error
  }
}

const handleDeletedEvents = async (credential, events) => {
  const integrationIds = events.map(e => e.integrations[0].id)

  const remoteEvents   = events.map(e => ({
    eventId: e.integrations[0].microsoftCalEvent.event_id,
    calendarId: e.integrations[0].microsoftCal.calendar_id,
    calendar: e.integrations[0].microsoftCal,
    sendUpdates: e.resource.sendUpdates,
    resource: e.resource,
  }))

  await MicrosoftCalendarEvent.batchDelete(credential, remoteEvents)
  await CalendarIntegration.deleteMany(integrationIds)

  return
}


module.exports = {
  refineEvents,
  handleCreatedEvents,
  handleUpdatedEvents,
  handleDeletedEvents
}