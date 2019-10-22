// const Context = require('../../../Context')

const GoogleCalendar       = require('../../calendar')
const GoogleCalendarEvents = require('../../calendar_events')
const GoogleCredential     = require('../../credential')
const CrmTask              = require('../../../CRM/Task/index')

const { generateCalendarEventRecord, generateCRMTaskRecord, getToSyncCalendars, fetchEvents } = require('./common')



const syncCalendarEventss = async (google, data) => {
  const googleCredentialId = data.googleCredential.id

  const tasks = []

  // let cancelledEvents = []
  let confirmedEvents = []
  let confirmedNum    = 0
  let canceledNum     = 0
  let createdTasksNum = 0

  try {

    const toSyncRemoteCalendars = await getToSyncCalendars(googleCredentialId)

    for ( const calendar of toSyncRemoteCalendars ) {

      const { confirmed, cancelled, nextSyncToken } = await fetchEvents(google, calendar)

      for ( const event of confirmed ) {
        confirmedEvents.push(generateCalendarEventRecord(googleCredentialId, calendar, event))
        tasks.push(generateCRMTaskRecord(data.googleCredential, event))

        if ( confirmedEvents.length === 50 ) {
          const createdEvents = await GoogleCalendarEvents.bulkUpsert(confirmedEvents)
          confirmedNum += createdEvents.length
          confirmedEvents = []
        }
      }

      if ( confirmedEvents.length > 0 ) {
        const createdEvents = await GoogleCalendarEvents.bulkUpsert(confirmedEvents)
        confirmedNum += createdEvents.length
        confirmedEvents = []
      }

      // how about new/updated  (bulkUpdate)
      const createdTaskIds = await CrmTask.createMany(tasks)
      createdTasksNum = createdTaskIds.length
 

      // how about new/deleted  (bulkDelete)
      for ( const event of cancelled ) {
        await GoogleCalendarEvents.updateLocalStatusByRemoteId(googleCredentialId, calendar.calendar_id, event.id, 'cancelled')
        canceledNum ++
      }

      await GoogleCalendar.updateSyncToken(calendar.id, nextSyncToken)
    }

    await GoogleCredential.updateCalendarsLastSyncAt(data.googleCredential.id)

    return  {
      status: true,
      ex: null,
      confirmedNum: confirmedNum,
      canceledNum: canceledNum,
      createdTasksNum: createdTasksNum
    }

  } catch (ex) {

    return  {
      status: false,
      ex: ex,
      confirmedNum: 0,
      canceledNum: 0
    }
  }
}


module.exports = {
  syncCalendarEventss
}