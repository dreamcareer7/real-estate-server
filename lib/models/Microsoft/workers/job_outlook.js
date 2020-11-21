const Slack    = require('../../Slack')
const Context  = require('../../Context')
const config   = require('../../../config')
const UsersJob = require('../../UsersJob/microsoft')

const MicrosoftCredential = {
  ...require('../credential/get')
}

const { getMGraphClient } = require('../plugin/client.js')
const { handleException, lockJob } = require('./helper')

const outlookWorker       = require('./outlook')
const subscriptionWorkers = require('./subscriptions/messages')

const JOB_NAME = 'outlook'



const syncOutlook = async (data) => {
  const credential = await MicrosoftCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByMicrosoftCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByMicrosoftCredential(credential.id, JOB_NAME)
  if (!userJob) {
    // Context.log('SyncOutlookMessages - Job skipped due to a pending job')
    return
  }

  if (userJob.resume_at) {
    if ( new Date(userJob.resume_at).getTime() >= new Date().getTime() ) {
      Context.log('SyncOutlookMessages - Job skipped due to the paused job', credential.id)
      return
    }
  }

  /*
    check to know if current credential/job has already done ove the specific time period
    userJob === 'waiting' ==> It means user has clicked on sync-now buttun to start immediately sync process
    userJob !== 'waiting' ==> It means the job is started by system scheduler
  */
  const diff = new Date().getTime() - new Date(userJob.start_at).getTime()
  if ( (userJob.status !== 'waiting') && (diff < config.emails_integration.outlook.miliSec) ) {
    // Context.log('SyncOutlookMessages - Job skipped due to recently finished job', credential.id, credential.email)
    return
  }

  await lockJob(credential, JOB_NAME)

  const { microsoft } = await getMGraphClient(credential)
  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: `SyncMicrosoft Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJob.upsertByMicrosoftCredential(credential, JOB_NAME, 'failed')
    return
  }


  Context.log('SyncOutlookMessages - Job Started', credential.id, credential.email)

  const last_start_at = userJob.start_at ? new Date(userJob.start_at) : new Date(0)


  // Sync Folders
  await outlookWorker.syncFolders(microsoft, credential)

  // Outlook Subscription
  if ( credential.scope_summary.includes('mail.read') ) {
    const outlookSubscriptionResult = await subscriptionWorkers.messages.handleSubscriptions(microsoft, credential)

    if ( !outlookSubscriptionResult.status ) {
      const message = 'Job Error - Microsoft Sync Failed [subscription]'
      await handleException(credential, JOB_NAME, message, outlookSubscriptionResult.ex)
      return
    }

    Context.log('SyncOutlookMessages Subscription')
  }

  // Sync Messages
  if ( credential.scope_summary.includes('mail.read') ) {
    const syncMessagesResult = await outlookWorker.syncMessages(microsoft, credential, last_start_at)

    if ( !syncMessagesResult.status && !syncMessagesResult.skip ) {
      const message = 'Job Error - Microsoft Sync Failed [messages]'
      await handleException(credential, JOB_NAME, message, syncMessagesResult.ex)
      return
    }

    Context.log('SyncOutlookMessages - Messages')
  }

  // Update as Success
  await UsersJob.upsertByMicrosoftCredential(credential, JOB_NAME, 'success')
  
  Context.log('SyncOutlookMessages - Job Finished')
}


module.exports = {
  syncOutlook
}