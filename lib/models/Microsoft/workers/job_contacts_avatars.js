const Slack    = require('../../Slack')
const Context  = require('../../Context')
const config   = require('../../../config')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { get } = require('../credential/get')
const { getMGraphClient } = require('../plugin/client.js')
const { handleException, lockJob } = require('./helper')

const contactWorker = require('./contacts')
const messageWorker = require('./outlook')
const subscriptionWorkers = require('./subscriptions/contacts')

const JOB_NAME = 'contact_avatar'



const skipJob = (userJob, origin) => {
  if (userJob.deleted_at) {
    return true
  }

  if ( userJob.resume_at && (new Date(userJob.resume_at).getTime() >= new Date().getTime()) ) {
    return true
  }

  /*
    check to know if current credential/job has already done ove the specific time period
    userJob === 'waiting' ==> It means user has clicked on sync-now buttun to start immediately sync process
    userJob !== 'waiting' ==> It means the job is started by system scheduler
  */
  const diff = new Date().getTime() - new Date(userJob.start_at).getTime()
  if ( (userJob.status !== 'waiting') && (diff < config.contacts_integration.miliSec) && (origin !== 'notifications') ) {
    // Context.log('SyncMicrosoftContactsAvatars - Job skipped due to recently finished job')
    return true
  }

  return false
}

const syncContactsAvatars = async (data) => {
  const credential = await get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByMicrosoftCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByMicrosoftCredential(credential.id, JOB_NAME)
  if (!userJob) {
    return
  }

  if (skipJob(userJob, data.origin)) {
    return
  }

  await lockJob(userJob)

  const { microsoft } = await getMGraphClient(credential)
  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: `SyncMicrosoftContactsAvatars Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await updateJobStatus(userJob.id, 'failed')
    return
  }


  Context.log('SyncMicrosoftContactsAvatars - Job Started', credential.id, credential.email)



  // Update as Success
  await updateJobStatus(userJob.id, 'success')

  Context.log('SyncMicrosoftContactsAvatars - Job Finished')
}


module.exports = {
  syncContactsAvatars
}