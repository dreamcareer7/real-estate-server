const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/microsoft')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const MicrosoftCredential = {
  ...require('../credential/get')
}

const { handleException, lockJob, microsoftClient } = require('./helper')

const outlookWorker       = require('./outlook')
const subscriptionWorkers = require('./subscriptions/messages')

const JOB_NAME = 'outlook'



const skipJob = (userJob) => {
  if (userJob.deleted_at) {
    return true
  }

  if ( userJob.resume_at && (new Date(userJob.resume_at).getTime() >= new Date().getTime()) ) {
    return true
  }

  return false
}


const syncOutlook = async (data) => {
  const credential = await MicrosoftCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByMicrosoftCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByMicrosoftCredential(credential.id, JOB_NAME)
  if (!userJob) {
    return
  }

  if (skipJob(userJob)) {
    await updateJobStatus(userJob.id, 'waiting')
    return
  }

  await lockJob(userJob)

  const microsoft = await microsoftClient(credential, userJob)
  if (!microsoft) {
    return
  }

  const last_start_at = userJob.start_at ? new Date(userJob.start_at) : new Date(0)
  Context.log('SyncOutlookMessages - Job Started', credential.id, credential.email, last_start_at)

  await outlookWorker.syncFolders(microsoft, credential)

  // Outlook Subscription
  if ( credential.scope_summary.includes('mail.read') ) {
    const outlookSubscriptionResult = await subscriptionWorkers.messages.handleSubscriptions(microsoft, credential)

    if ( !outlookSubscriptionResult.status ) {
      const message = 'Job Error - Microsoft Sync Failed [subscription]'
      await handleException(userJob, message, outlookSubscriptionResult.ex)
      return
    }

    Context.log('SyncOutlookMessages Subscription')
  }

  // Sync Messages
  if ( credential.scope_summary.includes('mail.read') ) {
    const syncMessagesResult = await outlookWorker.syncMessages(microsoft, credential, last_start_at)

    if ( !syncMessagesResult.status && !syncMessagesResult.skip ) {
      const message = 'Job Error - Microsoft Sync Failed [messages]'
      await handleException(userJob, message, syncMessagesResult.ex)
      return
    }

    Context.log('SyncOutlookMessages - Messages')
  }

  // Update as Success
  await updateJobStatus(userJob.id, 'success')
  
  Context.log('SyncOutlookMessages - Job Finished')
}


module.exports = {
  syncOutlook
}