// const Context = require('../../../Context')

const GoogleCalendar       = require('../../calendar')
const GoogleCalendarEvents = require('../../calendar_events')
const GoogleCredential     = require('../../credential')

const { generateCalendarEventRecord, getToSyncCalendars, fetchEvents } = require('./common')



const syncMessages = async (google, data) => {
  const googleCredentialId = data.googleCredential.id

  // let cancelledEvents = []
  let confirmedEvents = []
  let confirmedNum    = 0
  let canceledNum     = 0

  try {

    const toSyncRemoteCalendars = await getToSyncCalendars(googleCredentialId)

    for ( const calendar of toSyncRemoteCalendars ) {

      const { confirmed, cancelled, nextSyncToken } = await fetchEvents(google, calendar)

      for ( const event of confirmed ) {
        confirmedEvents.push(generateCalendarEventRecord(googleCredentialId, calendar, event))

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


      for ( const event of cancelled ) {
        await GoogleCalendarEvents.updateLocalStatusByRemoteId(googleCredentialId, calendar.calendar_id, event.id, 'cancelled')
        canceledNum ++
      }

      await GoogleCalendar.updateSyncToken(calendar.id, nextSyncToken)
    }


    await GoogleCredential.updateCalendarsLastSyncAt(data.googleCredential.id)
    // await GoogleCredential.updateMessagesSyncHistoryId(data.googleCredential.id, messages_sync_history_id)

    return  {
      status: true,
      ex: null,
      confirmedNum: confirmedNum,
      canceledNum: canceledNum
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
  syncMessages
}