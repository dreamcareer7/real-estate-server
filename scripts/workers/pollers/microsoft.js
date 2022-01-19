const MicrosoftWorker = require('../../../lib/models/Microsoft/workers')
// const { migrationDue } = require('../../../lib/models/Microsoft/migration/job')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: MicrosoftWorker.Calendar.syncDue,
    name: 'MicrosoftWorker.calendar.syncDue',
  })

  poll({
    fn: MicrosoftWorker.Contacts.syncDue,
    name: 'MicrosoftWorker.Contacts.syncDue',
  })

  poll({
    fn: MicrosoftWorker.Contacts.syncAvatars,
    name: 'MicrosoftWorker.Contacts.syncAvatars',
  })

  poll({
    fn: MicrosoftWorker.Outlook.syncDue,
    name: 'MicrosoftWorker.outlook.syncDue',
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

  // poll({
  //   fn: migrationDue,
  //   name: 'MicrosoftWorker.Migration.syncDue',
  // })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
