const EmailEventsNotif = require('../../../lib/models/Email/workers')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: EmailEventsNotif.parseNotifications,
  name: 'EmailEventsNotif.parseNotifications',
  wait: 5000
})