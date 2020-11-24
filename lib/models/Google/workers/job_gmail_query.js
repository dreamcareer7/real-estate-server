const Slack    = require('../../Slack')
const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/google')

const GoogleCredential = {
  ...require('../credential/get'),
  ...require('../credential/update')
}

const { getGoogleClient } = require('../plugin/client.js')
const { handleException, lockJob } = require('./helper')

const { syncByIds } = require('./gmail/message')

const JOB_NAME = 'gmail_query'



/*
  data: {
    gcid: google_credential_id,
    query: '<type>:(emailaddress)' // type: [to,from,cc,bcc]
  }
*/
const syncGmailByQuery = async (data) => {
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

  /*
    check to know if current credential/job has already done over the specific time period.
    Tip: Its disabled Because of supporting the real time sync.

    const diff = new Date().getTime() - new Date(userJob.start_at).getTime()
    if ( diff < config.emails_integration.miliSec ) return
  */

  await lockJob(credential, JOB_NAME)

  const google = await getGoogleClient(credential)
  if (!google) {
    Slack.send({ channel: 'integration_logs', text: `syncGmailByQuery Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJob.upsertByGoogleCredential(credential, JOB_NAME, 'failed')
    return
  }




  const Gmail = require('../gmail')

  const messageIds = await Gmail.searchByContact(data.gcid, data.query)

  await syncByIds(google, credential, messageIds)




  // Report success
  await UsersJob.upsertByGoogleCredential(credential, JOB_NAME, 'success')

  Context.log('syncGmailByQuery - Job Finished')
}


module.exports = {
  syncGmailByQuery
}