const Slack    = require('../../Slack')
const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/google')
const { deletebyId } = require('../../UsersJob/delete')

const MicrosoftCredential    = require('../credential/get')
const { getMicrosoftClient } = require('../plugin/client.js')
const Outlook = require('../outlook')

const { handleException, lockJob } = require('./helper')
const { syncByIds } = require('./outlook/message')

const JOB_NAME = 'outlook_query'



/*
  data: {
    cid: google_credential_id,
    metadata: {contact_address: 'saeed.uni68@gmail.com'}
  }
*/
const syncOutlookByQuery = async (data) => {
  if ( !data?.metadata?.contact_address ) {
    return
  }

  const credential = await MicrosoftCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByMicrosoftCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByMicrosoftCredential(credential.id, JOB_NAME)
  if (!userJob) {
    // Context.log('syncOutlookByQuery - Job skipped due to a pending job')
    return
  }

  if (userJob.resume_at) {
    if ( new Date(userJob.resume_at).getTime() >= new Date().getTime() ) {
      Context.log('syncOutlookByQuery - Job skipped due to the paused job', credential.id)
      return
    }
  }

  await lockJob(credential, JOB_NAME)

  const google = await getMicrosoftClient(credential)
  if (!google) {
    Slack.send({ channel: 'integration_logs', text: `syncOutlookByQuery Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJob.upsertByMicrosoftCredential(credential, JOB_NAME, 'failed')
    return
  }


  try {

    const messageIds = await Outlook.searchByContact(data.cid, data.metadata.contact_address)
  
    const result = await syncByIds(google, credential, messageIds)

    if ( !result.status ) {
      const message = 'Job Error - syncOutlookByQuery Failed [syncByIds]'
      await handleException(credential, JOB_NAME, message, result.ex)
      return
    }

    // Report success
    await UsersJob.upsertByMicrosoftCredential(credential, JOB_NAME, 'success')
    await deletebyId(userJob.id)

    Context.log('syncOutlookByQuery - Job Finished')

  } catch (ex) {

    const message = 'Job Error - SyncOutlookByQuery Failed'
    await handleException(credential, JOB_NAME, message, ex)
    return
  }
}


module.exports = {
  syncOutlookByQuery
}