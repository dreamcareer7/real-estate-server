const Context = require('../../lib/models/Context')
const { runInContext } = require('../../lib/models/Context/util')
const MicrosoftCredential = require('../../lib/models/Microsoft/credential')
const { lockJob } = require('../../lib/models/Microsoft/workers/helper')
const { syncRechatToMicrosoft } = require('../../lib/models/Microsoft/workers/job_cal')
const UsersJob = require('../../lib/models/UsersJob')
const { updateStatus: updateJobStatus } = require('../../lib/models/UsersJob/update')

const JOB_NAME = 'calendar'

async function main(program) {
  const options = program.opts()
  const credential = await MicrosoftCredential.get(options.credential)

  const userJob = await UsersJob.checkLockByMicrosoftCredential(credential.id, JOB_NAME)
  if (!userJob) return

  await lockJob(userJob)

  Context.log('SyncMicrosoftCalendar - [Rechat To Microsoft]')
  const result = await syncRechatToMicrosoft(credential, userJob, { last_updated_gt: 0 })
  if (result.error) {
    return
  }
  Context.log('SyncMicrosoftCalendar - [Rechat To Microsoft] Done')
  
  // Report success
  await updateJobStatus(userJob.id, 'success')
}

runInContext('sync-microsoft-calendar-from-rechat', main, program => {
  program
    .option('-c, --credential <credential>', 'microsoft credential id')
}).catch(ex => console.error(ex))
