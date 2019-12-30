const _  = require('lodash')
const Context = require('../../../Context')

const GoogleCalendar       = require('../../calendar')
const GoogleCalendarEvents = require('../../calendar_events')
const CrmTask           = require('../../../CRM/Task/index')

const { generateCalendarEventRecord, generateCrmTaskRecord, getToSyncCalendars, fetchEvents } = require('./common')



const syncCalendarEvents = async (google, data) => {
  const googleCredentialId = data.googleCredential.id

  let confirmedNum    = 0
  let createdTasksNum = 0
  let canceledNum     = 0

  try {

    const toSyncRemoteCalendars = await getToSyncCalendars(googleCredentialId)

    for ( const calendar of toSyncRemoteCalendars ) {

      let createdEvents = []
      let newEvents     = []
      let newTasks      = []

      const { confirmed, cancelled, nextSyncToken } = await fetchEvents(google, calendar)


      /***  Setup Mappings  ***/
      const confirmedEventIds = confirmed.map(e => e.id)
      const oldGoogleEvents   = await GoogleCalendarEvents.getByCalendarAndEventIds(googleCredentialId, calendar.id, confirmedEventIds)

      const oldGoogleEventRemoteIds  = oldGoogleEvents.map(c => c.event_id)
      const oldGoogleEventsByEventId = _.groupBy(oldGoogleEvents, 'event_id')

      const updatedGoogleEventRemoteIds = []
      const updatedGoogleEventIds       = []

      for (const event of confirmed) {
        if ( oldGoogleEventRemoteIds.includes(event.id) ) {
          updatedGoogleEventRemoteIds.push(event.id)
          updatedGoogleEventIds.push(oldGoogleEventsByEventId[event.id].id)
        }
      }

      const resutl        = CrmTask.filter(data.googleCredential.user, data.googleCredential.brand, { gcalendar_event_ids: updatedGoogleEventIds })
      const crmTaskModels = await CrmTask.getAll(resutl.ids)
      const oldCrmTasks   = await Orm.populate({ crmTaskModels, associations: ['crm_task.associations'] })


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



      /***  Handle Confirmed(Created/Updated) Events  ***/
      for ( const event of confirmed ) {

        // Refine google calendar events
        const event = generateCalendarEventRecord(googleCredentialId, calendar, event)
        if (event) newEvents.push(event)

        if ( newEvents.length === 50 ) {
          const events  = await GoogleCalendarEvents.bulkUpsert(newEvents)
          createdEvents = createdEvents.concat(events)
          confirmedNum += events.length
          newEvents     = []
        }
      }

      if ( newEvents.length > 0 ) {
        const events  = await GoogleCalendarEvents.bulkUpsert(newEvents)
        createdEvents = createdEvents.concat(events)
        confirmedNum += events.length
        newEvents     = []
      }
      
      const createdEventsByEventId = _.groupBy(createdCalendarEvents, 'event_id')









      




      const task = generateCrmTaskRecord(data.googleCredential, event)

      task.associations       = associationsMap[event.id]
      task.gcalendar_event_id = createdEventsByEventId[event.id].id

      newTasks.push(task)

      


    }

    return  {
      status: true,
      ex: null,
      confirmedNum: confirmedNum,
      canceledNum: canceledNum,
      createdTasksNum: createdTasksNum,
    }

  } catch (ex) {

    Context.log('SyncGoogle - syncCalendarEvents ex:', ex)

    return  {
      status: false,
      ex: ex,
      confirmedNum: 0,
      canceledNum: 0,
      createdTasksNum: 0
    }
  }
}


module.exports = {
  syncCalendarEvents
}