// @ts-nocheck
const MicrosoftCalendar = require('../../calendar')


const getToSyncCalendars = async function (gcid) {
  const toSync = []

  const calendars = await MicrosoftCalendar.getAllByMicrosoftCredential(gcid)

  for (const cal of calendars) {
    if ( cal.watcher_status !== 'stopped' )
      toSync.push(cal)
  }

  return toSync
}

const generateCalendarEventRecord = function (calendar, event) {
}

/** @returns {ITaskInput} */
const generateCrmTaskRecord = function (credential, event) {
}

const fetchEvents = async function (microsoft, calendar) {
}


module.exports = {
  generateCalendarEventRecord,
  generateCrmTaskRecord,
  getToSyncCalendars,
  fetchEvents
}