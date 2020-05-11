const GoogleCalendar = require('../../../calendar')


const getToSyncCalendars = async function (gcid) {
  const calendars = await GoogleCalendar.getAllByGoogleCredential(gcid)

  return calendars.filter(cal => ( cal.watcher_status === 'active' && !cal.deleted_at ))
}


module.exports = getToSyncCalendars