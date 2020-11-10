const config   = require('../../../config')
const Context  = require('../../Context')
const Slack    = require('../../Slack')
const UsersJob = require('../../UsersJob/microsoft')

const MicrosoftCredential = {
  ...require('../credential/get'),
  ...require('../credential/update')
}

const { getMGraphClient } = require('../plugin/client.js')

const outlookWorker       = require('./outlook')
const subscriptionWorkers = require('./subscriptions/messages')



const handleException = async (credential, msg, ex) => {
  Context.log('SyncOutlookMessages handleException', msg, ex)

  let invalidGrant = false

  if ( ex.message === 'invalid_grant' ) {
    invalidGrant = true
  }

  if (ex.response) {
    if (ex.response.body) {
      const body = JSON.parse(ex.response.body)

      if ( body.error === 'invalid_grant' ) {
        invalidGrant = true
      }
    }
  }

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    invalidGrant = true
  }

  if (invalidGrant) {
    await MicrosoftCredential.disconnect(credential.id)
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - StatusCode: ${ex.statusCode} - Message: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Microsoft-Outlook Job postponed`
  const emoji = ':skull:'

  Slack.send({ channel: 'integration_logs', text, emoji })

  await UsersJob.upsertByMicrosoftCredential(credential, 'outlook', 'failed')
}

const syncOutlook = async (data) => {
  const credential = await MicrosoftCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByMicrosoftCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByMicrosoftCredential(credential.id, 'outlook')
  if (!userJob) {
    // Context.log('SyncOutlookMessages - Job skipped due to a pending job')
    return
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

  /*
    Lock users_jobs record

    select * from users_jobs where microsoft_credential = credential.id AND job_name = 'outlook' FOR UPDATE;
    ==> lock will be released after commiting or rollbacking current transaction
  */
  await UsersJob.lockByMicrosoftCredential(credential.id, 'outlook')
  await UsersJob.upsertByMicrosoftCredential(credential, 'outlook', 'pending')

  const { microsoft } = await getMGraphClient(credential)
  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: `SyncMicrosoft Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJob.upsertByMicrosoftCredential(credential, 'outlook', 'failed')
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
      await handleException(credential, message, outlookSubscriptionResult.ex)
      return
    }

    Context.log('SyncOutlookMessages Subscription')
  }

  // Sync Messages
  if ( credential.scope_summary.includes('mail.read') ) {
    const syncMessagesResult = await outlookWorker.syncMessages(microsoft, credential, last_start_at)

    if ( !syncMessagesResult.status && !syncMessagesResult.skip ) {
      const message = 'Job Error - Microsoft Sync Failed [messages]'
      await handleException(credential, message, syncMessagesResult.ex)
      return
    }

    Context.log('SyncOutlookMessages - Messages')
  }

  // Update as Success
  await UsersJob.upsertByMicrosoftCredential(credential, 'outlook', 'success')
  
  Context.log('SyncOutlookMessages - Job Finished')
}


module.exports = {
  syncOutlook
}