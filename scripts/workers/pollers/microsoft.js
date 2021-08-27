const MicrosoftWorker = require('../../../lib/models/Microsoft/workers')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: MicrosoftWorker.Calendar.syncDue,
    name: 'MicrosoftWorker.calendar.syncDue',
    wait: 180000,
  })

  poll({
    fn: MicrosoftWorker.Contacts.syncDue,
    name: 'MicrosoftWorker.Contacts.syncDue',
    wait: 180000,
  })

  poll({
    fn: MicrosoftWorker.Contacts.syncAvatars,
    name: 'MicrosoftWorker.Contacts.syncAvatars',
    wait: 180000,
  })

  poll({
    fn: MicrosoftWorker.Outlook.syncDue,
    name: 'MicrosoftWorker.outlook.syncDue',
    wait: 180000,
  })

  poll({
    fn: MicrosoftWorker.Outlook.parseNotifications,
    name: 'MicrosoftWorker.Outlook.parseNotifications',
    wait: 5000,
  })

  poll({
    fn: MicrosoftWorker.Outlook.syncByQuery,
    name: 'MicrosoftWorker.Outlook.syncByQuery',
    wait: 5000,
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
