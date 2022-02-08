#!/usr/bin/env node

const createContext = require('../workers/utils/create-context')
const UsersJob = require('../../lib/models/UsersJob')
// const { syncOutlook } = require('../../lib/models/Microsoft/workers/job_outlook')
const { syncContacts } = require('../../lib/models/Microsoft/workers/job_contacts')
// const Deal = require('../../lib/models/Deal/get')
// const promisify = require('../../lib/utils/promisify')

const execute = async () => {
  const job = await UsersJob.get(process.argv[3])
  console.log(job)
  await UsersJob.updateStatus(job.id, 'queued')
  const updated = await UsersJob.get(job.id)
  console.log(updated)
  // await syncOutlook(job)

  const action = process.argv[2]

  await syncContacts({
    action,
    cid: job.microsoft_credential
  })
}

const main = async () => {
  const { commit, run } = await createContext({
    id: 'ync-output'
  })

  await run(async () => {
    await execute()
    await commit()
  })
}

main().catch(ex => {
  console.error(ex)
}).then(process.exit)
