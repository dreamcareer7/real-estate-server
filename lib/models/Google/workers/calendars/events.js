const _   = require('lodash')
// const Orm = require('../../../Orm')
const Context = require('../../../Context')

const GoogleCalendar      = require('../../calendar')
const GoogleCalendarEvent = require('../../calendar_events')
const Contact             = require('../../../Contact')
const CrmTask             = require('../../../CRM/Task/index')

const { generateCalendarEventRecord, generateCrmTaskRecord, getToSyncCalendars, fetchEvents } = require('./common')


const setupMapping = async (googleCredential, calendar, confirmed, cancelled) => {
  const canceledEventRemoteIds = []

  for ( const event of cancelled ) {
    canceledEventRemoteIds.push(event.id)
  }

  const confirmedRemoteIds = confirmed.map(e => e.id)
  const oldGoogleEvents    = await GoogleCalendarEvent.getByCalendarAndEventRemoteIds(calendar, confirmedRemoteIds)

  const oldEventsRemoteIds = oldGoogleEvents.map(c => c.event_id)
  const oldEventsByEventId = _.groupBy(oldGoogleEvents, 'event_id')

  const updatedGEventsRemoteIds = []
  const updatedGEventsIds       = []

  for (const event of confirmed) {
    if ( oldEventsRemoteIds.includes(event.id) ) {
      updatedGEventsRemoteIds.push(event.id)
      updatedGEventsIds.push(oldEventsByEventId[event.id].id)
    }
  }

  // const resutl        = CrmTask.filter(googleCredential.user, googleCredential.brand, { google_event_ids: updatedGEventsIds })
  // const crmTaskModels = await CrmTask.getAll(resutl.ids)
  // const oldCrmTasks = await Orm.populate({ crmTaskModels, associations: ['crm_task.associations'] })


  const emails   = confirmed.flatMap(event => event.attendees.map(({email}) => email))
  const {ids}    = await Contact.fastFilter(googleCredential.brand, [{ attribute_type: 'email', value: emails, operator: 'any' }], {})
  const contacts = await Contact.getAll(ids)

  /*
    const contactsMap = {
      'a@rechat.com': c1,
      'b@rechat.com': c2,
      'c@rechat.com': null
    }
  */
  const contactsMap = {}
  for (const email of emails) {
    const c = contacts.find(contact => contact.emails.includes(email))
    contactsMap[email] = c.id
  }

  /*
    const associationsMap = {
      event_id_1: [{ contact: c1.id, association_type: 'contact' }],
      event_id_2: [{ contact: c2.id, association_type: 'contact' }],
    }
  */
  const associationsMap = {}
  for (const event of confirmed) {
    associationsMap[event.id] = event.attendees.map(attendee => ({
      association_type: 'contact',
      contact: contactsMap[attendee.email]
    }))
  }


  return {
    canceledEventRemoteIds,
    updatedGEventsRemoteIds,
    associationsMap
  }
}


const syncCalendarEvents = async (google, data) => {
  let confirmedNum    = 0
  let canceledNum     = 0
  let createdTasksNum = 0
  let updatedTasksNum = 0

  try {
    const toSyncRemoteCalendars = await getToSyncCalendars(data.googleCredential.id)

    for ( const calendar of toSyncRemoteCalendars ) {
      
      const newEvents     = []
      const newTasks      = []
      const toUpdateTasks = []

      const { confirmed, cancelled, nextSyncToken } = await fetchEvents(google, calendar)

      canceledNum  += cancelled.length
      confirmedNum += confirmed.length

      const { canceledEventRemoteIds, updatedGEventsRemoteIds, associationsMap } = await setupMapping(data.googleCredential, calendar, confirmed, cancelled)


      /***  Handle Confirmed(Created/Updated) Events  ***/
      for ( const event of confirmed ) {
        newEvents.push(generateCalendarEventRecord(calendar, event))
      }
      const createdEvents = await GoogleCalendarEvent.bulkUpsert(newEvents)
      const createdEventsByEventId = _.groupBy(createdEvents, 'event_id')



      /***  Create And Update CRM_TASK records  ***/
      for (const event of confirmed) {
        if ( updatedGEventsRemoteIds.includes(event.id) ) {
          toUpdateTasks.push(event.id)
        } else {
          const task = generateCrmTaskRecord(data.googleCredential, event)
          task.associations    = associationsMap[event.id]
          task.google_event_id = createdEventsByEventId[event.id].id
          newTasks.push(task)
        }
      }

      const createdTasksIds = await CrmTask.createMany(newTasks)
      createdTasksNum += createdTasksIds.length

      const updatedTasksIds = await CrmTask.updateMany(toUpdateTasks)
      updatedTasksNum += updatedTasksIds.length



      /***  Handle Canceled(Deleted) Events  ***/    
      const canceledGoogleEventIds = await GoogleCalendarEvent.deleteManyByRemoteIds(calendar.google_credential, calendar.id, canceledEventRemoteIds)
      const filterResutl = CrmTask.filter(data.googleCredential.user, data.googleCredential.brand, { google_event_ids: canceledGoogleEventIds })
      await CrmTask.deleteMany(filterResutl.ids)


      /***  Update Calendar Sync Token  ***/
      await GoogleCalendar.updateSyncToken(calendar.id, nextSyncToken)
    }

    return  {
      status: true,
      ex: null,
      confirmedNum,
      canceledNum,
      createdTasksNum,
      updatedTasksNum,
    }

  } catch (ex) {

    Context.log('SyncGoogle - syncCalendarEvents ex:', ex)

    return  {
      status: false,
      ex,
      confirmedNum,
      canceledNum,
      createdTasksNum
    }
  }
}


module.exports = {
  syncCalendarEvents
}