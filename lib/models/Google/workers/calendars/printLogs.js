const Context = require('../../../Context')
const { groupBy } = require('lodash')


const printLogs = (calEvents, created, updated, deleted) => {
  Context.log('SyncGoogleCalendar RechatToGoogle CalEvents Length', calEvents.length)
  Context.log('SyncGoogleCalendar RechatToGoogle Created Length', created.length)
  Context.log('SyncGoogleCalendar RechatToGoogle Updated Length', updated.length)
  Context.log('SyncGoogleCalendar RechatToGoogle Deleted Length', deleted.length)

  const first = calEvents[0]
  const last  = calEvents[calEvents.length - 1]

  Context.log('SyncGoogleCalendar calEvents[first]', first.title, new Date(first.timestamp * 1000), new Date(first.last_updated_at))
  Context.log('SyncGoogleCalendar calEvents[last]', last.title, new Date(last.timestamp * 1000), new Date(last.last_updated_at))

  const byObjectType = groupBy(calEvents, 'object_type')

  for (const type of Object.keys(byObjectType)) {
    Context.log('SyncGoogleCalendar Type:', type, byObjectType[type].length)
  }
}


module.exports = printLogs