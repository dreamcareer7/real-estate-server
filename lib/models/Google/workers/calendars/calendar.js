const GoogleCalendar = require('../../calendar')

const { getToSyncCalendars } = require('./common')


const syncCalendars = async (data) => {
  try {

    const toSyncLocalCalendars    = await getToSyncCalendars(data.googleCredential.id)
    const toSyncRemoteCalendarIds = toSyncLocalCalendars.map(record => record.calendar_id)

    await GoogleCalendar.persistRemoteCalendars(data.googleCredential.id, toSyncRemoteCalendarIds)

    for (const calendar of toSyncLocalCalendars) {

      if ( calendar.watcher_status === 'active' && calendar.watcher_channel_id ) {

        const unixTS   = new Date().getTime() / 1000
        const expireIn = calendar.watcher.expiration / 1000
        const timeGap  = 60 * 60 // 60 minutes
      
        // Refresh channel, old channel will be ignored until its expiration
        if ( (expireIn - unixTS) > timeGap )        
          await GoogleCalendar.watch(calendar.id)
      }
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

// It is merged into syncCalendars
const checkCalendarsChannel = async (data) => {
  try {

    const toSyncLocalCalendars = await getToSyncCalendars(data.googleCredential.id)

    for (const calendar of toSyncLocalCalendars) {

      if ( calendar.watcher_status === 'active' && calendar.watcher_channel_id ) {

        const unixTS   = new Date().getTime() / 1000
        const expireIn = calendar.watcher.expiration / 1000
        const timeGap  = 60 * 60 // 60 minutes
      
        // Refresh channel, old channel will be ignored until its expiration
        if ( (expireIn - unixTS) > timeGap )        
          await GoogleCalendar.watch(calendar.id)
      }
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