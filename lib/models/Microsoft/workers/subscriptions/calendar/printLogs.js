const Context = require('../../../../Context')
const { groupBy } = require('lodash')


const printLogs = (calEvents, created, updated, deleted) => {
  Context.log('SyncMicrosoftCalendar RechatToMicrosoft calEvents.length', calEvents.length)
  Context.log('SyncMicrosoftCalendar RechatToMicrosoft created.length', created.length)
  Context.log('SyncMicrosoftCalendar RechatToMicrosoft updated.length', updated.length)
  Context.log('SyncMicrosoftCalendar RechatToMicrosoft deleted.length', deleted.length)

  Context.log('---- created', created)
  Context.log('---- updated', updated)
  Context.log('---- deleted', deleted)

  const first = calEvents[0]
  const last  = calEvents[calEvents.length - 1]

  Context.log('SyncMicrosoftCalendar calEvents[first]', first.title, new Date(first.timestamp * 1000), new Date(first.last_updated_at))
  Context.log('SyncMicrosoftCalendar calEvents[last]', last.title, new Date(last.timestamp * 1000), new Date(last.last_updated_at))

  const byObjectType = groupBy(calEvents, 'object_type')

  for (const type of Object.keys(byObjectType)) {
    Context.log('SyncMicrosoftCalendar Type:', type, byObjectType[type].length)
  }
}


module.exports = printLogs