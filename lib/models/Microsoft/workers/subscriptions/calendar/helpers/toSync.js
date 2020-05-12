const MicrosoftCalendar = require('../../../../calendar')


const getToSyncCalendars = async function (gcid) {
  const calendars = await MicrosoftCalendar.getAllByMicrosoftCredential(gcid)

  return  calendars.filter(cal => ( cal.to_sync && !cal.deleted_at ))
}


module.exports = getToSyncCalendars