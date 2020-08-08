#!/usr/bin/env node

const Context = require('../../../lib/models/Context')
const Job = require('../../../lib/models/Job')
const MLSJob = require('../../../lib/models/MLSJob')

const MicrosoftWorker = require('../../../lib/models/Microsoft/workers/index')
const { runInContext } = require('../../../lib/models/Context/util')
const promisify = require('../../../lib/utils/promisify')

runInContext(`sync-microsoft-contacts-${new Date().toLocaleTimeString('en-us')}`, async () => {
  await MicrosoftWorker.Contacts.syncDue()
  await promisify(Job.handle)(Context.get('jobs'))

  await promisify(MLSJob.insert)(
    {
      name: 'microsoft_contacts'
    }
  )

  process.exit()
})