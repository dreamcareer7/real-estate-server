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

const checkCalendarsChannel = async (data) => {
  try {

    const toSyncRemoteCalendars = await getToSyncCalendars(data.googleCredential.id)

    for (const calendar of toSyncRemoteCalendars) {

      const unixTS   = new Date().getTime() / 1000
      const expireIn = calendar.watcher.expiration / 1000
      const timeGap  = 60 * 60 // 60 minutes
    
      // Refresh channel
      if ( (expireIn - unixTS) > timeGap )        
        await GoogleCalendar.watch(calendar.id)
    }

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
  syncCalendars,
  checkCalendarsChannel
}