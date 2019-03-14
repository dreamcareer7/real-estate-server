#!/usr/bin/env node

const Context = require('../../../lib/models/Context')
const Job = require('../../../lib/models/Job')
const MLSJob = require('../../../lib/models/MLSJob')
const CalendarWorker = require('../../../lib/models/Calendar/worker')
const runInContext = require('../../../lib/models/Context/util')
const promisify = require('../../../lib/utils/promisify')

runInContext(`calendar-notification-${new Date().toLocaleTimeString('en-us')}`, async () => {
  await CalendarWorker.sendNotifications()
  await promisify(Job.handle)(Context.get('jobs'))

  await promisify(MLSJob.insert)(
    {
      name: 'calendar_notification'
    }
  )

  process.exit()
})
