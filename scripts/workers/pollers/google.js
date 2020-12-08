const GoogleWorkers = require('../../../lib/models/Google/workers')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: GoogleWorkers.Calendar.syncDue,
  name: 'GoogleWorkers.Calendar.syncDue',
  wait: 60000
})

poll({
  fn: GoogleWorkers.Calendar.parseNotifications,
  name: 'GoogleWorkers.Calendar.parseNotifications',
  wait: 5000
})

poll({
  fn: GoogleWorkers.Contacts.syncDue,
  name: 'GoogleWorkers.Contacts.syncDue',
  wait: 60000
})

poll({
  fn: GoogleWorkers.Contacts.syncAvatars,
  name: 'GoogleWorkers.Contacts.syncAvatars',
  wait: 60000
})

poll({
  fn: GoogleWorkers.Gmail.syncDue,
  name: 'GoogleWorkers.Gmail.syncDue',
  wait: 60000
})

poll({
  fn: GoogleWorkers.Gmail.parseNotifications,
  name: 'GoogleWorkers.Gmail.parseNotifications',
  wait: 5000
})

poll({
  fn: GoogleWorkers.Gmail.syncByQuery,
  name: 'GoogleWorkers.Gmail.syncByQuery',
  wait: 5000
})