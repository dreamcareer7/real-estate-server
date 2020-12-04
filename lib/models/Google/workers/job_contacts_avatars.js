const Slack    = require('../../Slack')
const Context  = require('../../Context')
const config   = require('../../../config')
const Socket   = require('../../Socket')

const UsersJob = require('../../UsersJob/google')
const { deleteById } = require('../../UsersJob/delete')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { getGoogleClient } = require('../plugin/client.js')
const { handleException, lockJob } = require('./helper')

const GoogleCredential = {
  ...require('../credential/get')
}

const contactWorker = require('./contacts/contact')

const JOB_NAME = 'contact_avatar'



const skipJob = (userJob) => {
  if (userJob.deleted_at) {
    return true
  }

  if ( userJob.resume_at && (new Date(userJob.resume_at).getTime() >= new Date().getTime()) ) {
    return true
  }

  return false
}

const syncContactsAvatars = async (data) => {
  const credential = await GoogleCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByGoogleCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByGoogleCredential(credential.id, JOB_NAME)
  if (!userJob) {
    return
  }

  if (skipJob(userJob)) {
    return
  }

  await lockJob(userJob)

  const google = await getGoogleClient(credential)
  if (!google) {
    Slack.send({ channel: 'integration_logs', text: `Google-Contacts Sync Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await updateJobStatus(userJob.id, 'failed')
    return
  }


  Context.log('syncGoogleContactsAvatars - Job Started', credential.id, credential.email)



  // Update as Success
  await updateJobStatus(userJob.id, 'success')
  await deleteById(userJob.id)

  Context.log('syncGoogleContactsAvatars - Job Finished')
}


module.exports = {
  syncContactsAvatars
}