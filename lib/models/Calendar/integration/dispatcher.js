const _   = require('lodash')
const Orm = require('../../Orm')
const Context = require('../../Context')

const GoogleCredential    = require('../../Google/credential')
const GoogleCalendar      = require('../../Google/calendar')
const GoogleCalendarEvent = require('../../Google/calendar_events')
const CalendarIntegration = require('./index')
const Contact             = require('../../Contact')
const User                = require('../../User')
const CrmTask             = require('../../CRM/Task/index')

const { generateCalendarEventRecord, generateCrmTaskRecord, getToSyncCalendars, fetchEvents } = require('../../Google/workers/calendars/common')

const getClient = require('../../Google/client')


const generateEvent = async (task) => {
  const contactIds = task.people.map(p => p.id)
  const contacts   = await Contact.getAll(contactIds)

  return {
    summary: task.title,
    description: '',
    status: (task.status === 'DONE') ? 'cancelled' : 'confirmed',
    
    attendees: contacts.map(c => ({ 'email': c.email, 'displayName': c.display_name })),
  
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 30 * 60 },
      ]
    },
  
    start: {
      // date: 'The date, in the format yyyy-mm-dd, if this is an all-day event',
      dateTime: new Date(task.date),
      timeZone: 'America/Los_Angeles'
    },
    end: {
      // date: 'The date, in the format yyyy-mm-dd, if this is an all-day event',
      dateTime: new Date(task.end_date),
      timeZone: 'America/Los_Angeles'
    },
  
    extendedProperties: {
      shared: {
        origin: 'rechat',
        metadata: task.metadata
      }
    }
  }
}


const handleCreateAndUpdate = async(calendar, tasks) => {
  // one user-brand ==> multiple connected google-accounts ???
  
  for (const task of tasks) {
    const currentTask = await CrmTask.get(task.id)
    const integration = await CalendarIntegration.getByGoogleCrmTask(task.id)
    const resource    = await generateEvent(task)
    

    if (integration) {

      const { status, local, remote } = await GoogleCalendarEvent.update(integration.google_id, calendar, resource)

    } else {

      // create a new integration records and a new remote-google-calendar-event
      const { id, remote } = await GoogleCalendarEvent.create(calendar, resource)
  
      const record = {
        google_id: id,
        microsoft_id: null,
  
        crm_task: task.id,
        contact: null,
        contact_attribute: null,
        deal_context: null,
  
        object_type: task.object_type,
        event_type: task.event_type,
        origin: 'rechat'
      }
  
      await CalendarIntegration.insert([record])
    }
  }
}

const handleDelete = async(calendar, tasks) => {
  // one user-brand ==> multiple connected google-accounts ???
  
  for (const task of tasks) {
    const integration = await CalendarIntegration.getByGoogleCrmTask(task.id)

    if (integration) {
      await GoogleCalendarEvent.delete(integration.google_id, calendar)
      await CalendarIntegration.deleteMany([integration.id])
    }
  }
}