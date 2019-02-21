#!/usr/bin/env node

const MLSJob = require('../../../lib/models/MLSJob')
const CalendarWorker = require('../../../lib/models/Calendar/worker')
const runInContext = require('../../../lib/models/Context/util')

runInContext(`calendar-notification-${new Date().toLocaleTimeString('en-us')}`, async () => {
  await CalendarWorker.sendNotifications()

  MLSJob.insert(
    {
      name: 'calendar_notification'
    },
    process.exit
  )
})
