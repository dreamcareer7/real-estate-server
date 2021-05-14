const Context  = require('../../Context')
const config   = require('../../../config')
const UsersJob = require('../../UsersJob/microsoft')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { updatePrimaryEmail } = require('../credential/update')
const MicrosoftCredential = {
  ...require('../credential/get')
}

const { handleException, lockJob, microsoftClient } = require('./helper')

const outlookWorker       = require('./outlook')
const subscriptionWorkers = require('./subscriptions/messages')
const microsoft_credential = require('../../../../tests/unit/microsoft/data/microsoft_credential')

const JOB_NAME = 'outlook'



const skipJob = (userJob) => {
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
  if ( (userJob.status !== 'waiting') && (diff < config.emails_integration.outlook.miliSec) ) {
    // Context.log('SyncOutlookMessages - Job skipped due to recently finished job', credential.id, credential.email)
    return
  }

  return false
}

const checkPrimaryEmail = async (credential, microsoft) => {
  const profileObj = await microsoft.getProfileNative()
  const primaryEmail = profileObj.mail.toLowerCase()

  if ( credential.email !== primaryEmail ) {
    await updatePrimaryEmail(credential.id, primaryEmail)
    Context.log('SyncOutlookMessages - checkPrimaryEmail done', credential.id, credential.email, primaryEmail)
  } else {
    Context.log('SyncOutlookMessages - checkPrimaryEmail skipped', credential.id, credential.email, primaryEmail)
  }
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
    return
  }

  await lockJob(userJob)

  const microsoft = await microsoftClient(credential, userJob)
  if (!microsoft) {
    return
  }


  Context.log('SyncOutlookMessages - Job Started', credential.id, credential.email)

  const last_start_at = userJob.start_at ? new Date(userJob.start_at) : new Date(0)


  // temporary operation
  await checkPrimaryEmail(credential, microsoft)


  // Sync Folders
  Context.log('SyncOutlookMessages - Sync Folders', credential.id, credential.email)
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