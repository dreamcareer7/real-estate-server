const Slack    = require('../../Slack')
const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/google')
const { deletebyId } = require('../../UsersJob/delete')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const GoogleCredential    = require('../credential/get')
const { getGoogleClient } = require('../plugin/client.js')
const Gmail = require('../gmail')

const { handleException, lockJob } = require('./helper')
const { syncByIds } = require('./gmail/message')

const JOB_NAME = 'gmail_query'



const syncGmailByQuery = async (data) => {
  if ( !data?.metadata?.contact_address ) {
    return
  }

  const credential = await GoogleCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByGoogleCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByGoogleCredential(credential.id, JOB_NAME)
  if (!userJob) {
    // Context.log('syncGmailByQuery - Job skipped due to a pending job')
    return
  }

  if (userJob.resume_at) {
    if ( new Date(userJob.resume_at).getTime() >= new Date().getTime() ) {
      Context.log('syncGmailByQuery - Job skipped due to the paused job', credential.id)
      return
    }
  }

  await lockJob(userJob)

  const google = await getGoogleClient(credential)
  if (!google) {
    Slack.send({ channel: 'integration_logs', text: `syncGmailByQuery Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await updateJobStatus(userJob.id, 'failed')
    return
  }


  try {

    const messageIds = await Gmail.searchByContact(data.cid, data.metadata.contact_address)
  
    const result = await syncByIds(google, credential, messageIds)

    if ( !result.status ) {
      const message = 'Job Error - syncGmailByQuery Failed [syncByIds]'
      await handleException(userJob, message, result.ex)
      return
    }

    // Report success
    await updateJobStatus(userJob.id, 'success')
    await deletebyId(userJob.id)

    Context.log('syncGmailByQuery - Job Finished')

  } catch (ex) {

    const message = 'Job Error - SyncGmailByQuery Failed'
    await handleException(userJob, message, ex)
    return
  }
}


module.exports = {
  syncGmailByQuery
}