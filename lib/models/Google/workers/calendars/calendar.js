const GoogleCalendar = require('../../calendar')

const { getToSyncCalendars } = require('./common')


const syncCalendars = async (data) => {
  try {

    const toSyncRemoteCalendars   = await getToSyncCalendars(data.googleCredential.id)
    const toSyncRemoteCalendarIds = toSyncRemoteCalendars.map(record => record.calendar_id)

    await GoogleCalendar.persistRemoteCalendars(data.googleCredential.id, toSyncRemoteCalendarIds)

    return  {
      status: true,
      ex: null
    }

  } catch (ex) {

    return  {
      status: false,
      ex: ex
    }
  }
}


module.exports = {
  syncCalendars
}