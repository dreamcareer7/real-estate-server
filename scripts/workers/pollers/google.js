const GoogleWorkers = require('../../../lib/models/Google/workers')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: GoogleWorkers.Calendar.syncDue,
    name: 'GoogleWorkers.Calendar.syncDue'
  })

  poll({
    fn: GoogleWorkers.Calendar.parseNotifications,
    name: 'GoogleWorkers.Calendar.parseNotifications',
    wait: 5000,
  })

  poll({
    fn: GoogleWorkers.Contacts.syncDue,
    name: 'GoogleWorkers.Contacts.syncDue',
  })

  poll({
    fn: GoogleWorkers.Contacts.syncAvatars,
    name: 'GoogleWorkers.Contacts.syncAvatars',
  })

  poll({
    fn: GoogleWorkers.Gmail.syncDue,
    name: 'GoogleWorkers.Gmail.syncDue',
  })

  poll({
    fn: GoogleWorkers.Gmail.parseNotifications,
    name: 'GoogleWorkers.Gmail.parseNotifications',
    wait: 5000,
  })

  poll({
    fn: GoogleWorkers.Gmail.syncByQuery,
    name: 'GoogleWorkers.Gmail.syncByQuery',
    wait: 5000,
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
