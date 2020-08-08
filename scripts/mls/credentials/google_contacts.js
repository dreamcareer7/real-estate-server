#!/usr/bin/env node

const Context = require('../../../lib/models/Context')
const Job = require('../../../lib/models/Job')
const MLSJob = require('../../../lib/models/MLSJob')

const GoogleWorker = require('../../../lib/models/Google/workers/index')
const { runInContext } = require('../../../lib/models/Context/util')
const promisify = require('../../../lib/utils/promisify')

runInContext(`sync-google-contacts-${new Date().toLocaleTimeString('en-us')}`, async () => {
  await GoogleWorker.Contacts.syncDue()
  await promisify(Job.handle)(Context.get('jobs'))

  await promisify(MLSJob.insert)(
    {
      name: 'google_contacts'
    }
  )

  process.exit()
})