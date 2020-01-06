const _  = require('lodash')
const Context = require('../../../Context')

const GoogleCalendar      = require('../../calendar')
const GoogleCalendarEvent = require('../../calendar_events')
const Contact             = require('../../../Contact')
const CrmTask             = require('../../../CRM/Task/index')

const { generateCalendarEventRecord, generateCrmTaskRecord, getToSyncCalendars, fetchEvents } = require('./common')



const syncCalendarEvents = async (google, data) => {
  const googleCredentialId = data.googleCredential.id

  let confirmedNum    = 0
  let canceledNum     = 0
  let createdTasksNum = 0
  let updatedTasksNum = 0

  try {

    const toSyncRemoteCalendars = await getToSyncCalendars(googleCredentialId)

    for ( const calendar of toSyncRemoteCalendars ) {

      const newTasks = []
      const toUpdateTasks = []
      const canceledEventRemoteIds = []

      let createdEvents = []
      let newEvents     = []

      const { confirmed, cancelled, nextSyncToken } = await fetchEvents(google, calendar)

      canceledNum  += cancelled.length
      confirmedNum += confirmed.length


      /***  Setup Mappings  ***/
      for ( const event of cancelled ) {
        canceledEventRemoteIds.push(event.id)
      }

      const confirmedEventRemoteIds = confirmed.map(e => e.id)
      const oldGoogleEvents         = await GoogleCalendarEvent.getByCalendarAndEventRemoteIds(calendar, confirmedEventRemoteIds)

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

      // const resutl        = CrmTask.filter(data.googleCredential.user, data.googleCredential.brand, { google_event_ids: updatedGoogleEventIds })
      // const crmTaskModels = await CrmTask.getAll(resutl.ids)
      // const oldCrmTasks   = await Orm.populate({ crmTaskModels, associations: ['crm_task.associations'] })


      const emails   = confirmed.flatMap(event => event.attendees.map(({email}) => email))
      const {ids}    = await Contact.fastFilter(data.googleCredential.brand, [{ attribute_type: 'email', value: emails, operator: 'any' }], {})
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
        const e = generateCalendarEventRecord(googleCredentialId, calendar, event)
        if (e) newEvents.push(e)

        if ( newEvents.length === 50 ) {
          const events  = await GoogleCalendarEvent.bulkUpsert(newEvents)
          createdEvents = createdEvents.concat(events)
          newEvents     = []
        }
      }

      if ( newEvents.length > 0 ) {
        const events  = await GoogleCalendarEvent.bulkUpsert(newEvents)
        createdEvents = createdEvents.concat(events)
        newEvents     = []
      }
      
      const createdEventsByEventId = _.groupBy(createdEvents, 'event_id')




      for (const event of confirmed) {
        if ( updatedGoogleEventRemoteIds.includes(event.id) ) {

          // required mopre logic here
          toUpdateTasks.push(event.id)

        } else {

          const t = generateCrmTaskRecord(data.googleCredential, event)
    
          t.associations    = associationsMap[event.id]
          t.google_event_id = createdEventsByEventId[event.id].id
    
          newTasks.push(t)
        }
      }

      // Create And Update CRM_TASK records
      const createdTasksIds = await CrmTask.createMany(newTasks)
      createdTasksNum += createdTasksIds.length

      const updatedTasksIds = await CrmTask.updateMany(toUpdateTasks)
      updatedTasksNum += updatedTasksIds.length





      /***  Handle Canceled(Deleted) Events  ***/    
      const canceledGoogleEventIds = await GoogleCalendarEvent.deleteManyByRemoteIds(googleCredentialId, calendar.id, canceledEventRemoteIds)

      const filterResutl = CrmTask.filter(data.googleCredential.user, data.googleCredential.brand, { google_event_ids: canceledGoogleEventIds })
      await CrmTask.deleteMany(filterResutl.ids)



      
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