const _  = require('lodash')
const Context = require('../../../Context')

const GoogleCalendar      = require('../../calendar')
const GoogleCalendarEvent = require('../../calendar_events')
const CrmTask             = require('../../../CRM/Task/index')

const { generateCalendarEventRecord, generateCrmTaskRecord, getToSyncCalendars, fetchEvents } = require('./common')



const syncCalendarEvents = async (google, data) => {
  const googleCredentialId = data.googleCredential.id

  let confirmedNum    = 0
  let createdTasksNum = 0
  let canceledNum     = 0

  try {

    const toSyncRemoteCalendars = await getToSyncCalendars(googleCredentialId)

    for ( const calendar of toSyncRemoteCalendars ) {

      let createdCalendarEvents = []
      let confirmedEvents       = []
      let newTasks              = []

      const { confirmed, cancelled, nextSyncToken } = await fetchEvents(google, calendar)

      Context.log(`SyncGoogle syncCalendarEvents - calendar: ${calendar.summary} - confirmed: ${confirmed.length} - cancelled: ${cancelled.length}`, )


      /***  Handle Confirmed(Created/Updated) Events  ***/
      for ( const event of confirmed ) {
        // Refine crm tasks records
        const crmRecord = await generateCrmTaskRecord(data.googleCredential, event)
        // console.log('---- crmRecord', crmRecord)
        if (crmRecord) newTasks.push(crmRecord)

        // Refine google calendar events
        const gcEvent = generateCalendarEventRecord(googleCredentialId, calendar, event)
        // console.log('---- gcEvent', gcEvent)
        if (gcEvent) confirmedEvents.push(gcEvent)

        if ( confirmedEvents.length === 50 ) {
          const events = await GoogleCalendarEvent.bulkUpsert(confirmedEvents)
          createdCalendarEvents = createdCalendarEvents.concat(events)
          confirmedNum         += events.length
          confirmedEvents       = []
        }
      }

      if ( confirmedEvents.length > 0 ) {
        const events = await GoogleCalendarEvent.bulkUpsert(confirmedEvents)
        createdCalendarEvents = createdCalendarEvents.concat(events)
        confirmedNum         += events.length
        confirmedEvents       = []
      }


      const createdEventsByEventId = _.groupBy(createdCalendarEvents, 'event_id')
      // console.log('--------------- createdEventsByEventId', createdEventsByEventId)

      // for ( const task of newTasks ) {
      //   task.google_event_id = createdEventsByEventId[event.id].id
      // }

      // Create And Update CRM_TASK records
      // const createdTasksIds = await CrmTask.createUpdateMany(newTasks)
      // createdTasksNum += createdTasksIds.length



      /***  Handle Canceled(Deleted) Events  ***/
      const canceledGCEventIds = []

      for ( const event of cancelled ) {
        // console.log('---- cancelled event', event)
        const id = await GoogleCalendarEvent.updateLocalStatusByRemoteId(googleCredentialId, calendar.id, event.id, 'cancelled')
        canceledGCEventIds.push(id)
      }

      // await CrmTask.deleteByGoogleCalendarEventIds(canceledGCEventIds)


      await GoogleCalendar.updateSyncToken(calendar.id, nextSyncToken)

      canceledNum += cancelled.length
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