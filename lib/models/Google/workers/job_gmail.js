const Slack    = require('../../Slack')
const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/google')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const GoogleCredential = {
  ...require('../credential/get'),
  ...require('../credential/update')
}

const { getGoogleClient } = require('../plugin/client.js')
const { handleException, lockJob } = require('./helper')

const messageWorker = require('./gmail/message')
const historyWorker = require('./gmail/history')
const labelWorker   = require('./gmail/label')

const JOB_NAME = 'gmail'



const messagesFullSync = async function(google, credential, userJob, hasLostState = false) {
  const syncMessagesResult = await messageWorker.syncMessages(google, credential, hasLostState)

  if ( !syncMessagesResult.status ) {
    const message = 'Job Error - SyncGoogleMessages Failed [sync-messages]'
    await handleException(userJob, message, syncMessagesResult.ex)
    return
  }

  Context.log('SyncGoogleMessages - MessagesFullSync Done')
}

const syncGmail = async (data) => {
  const credential = await GoogleCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByGoogleCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByGoogleCredential(credential.id, JOB_NAME)
  if (!userJob) {
    // Context.log('SyncGoogleMessages - Job skipped due to a pending job')
    return
  }

  if (userJob.resume_at) {
    if ( new Date(userJob.resume_at).getTime() >= new Date().getTime() ) {
      Context.log('SyncGoogleMessages - Job skipped due to the paused job', credential.id)
      return
    }
  }

  /*
    check to know if current credential/job has already done over the specific time period.
    Tip: Its disabled Because of supporting the real time sync.

    const diff = new Date().getTime() - new Date(userJob.start_at).getTime()
    if ( diff < config.emails_integration.miliSec ) return
  */

  await lockJob(userJob)

  const google = await getGoogleClient(credential)
  if (!google) {
    Slack.send({ channel: 'integration_logs', text: `SyncGoogleMessages Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await updateJobStatus(userJob.id, 'failed')
    return
  }


  Context.log('SyncGoogleMessages - Job Started', credential.id, credential.email)

  let dailySync = false


  // Sync Labels
  if ( credential.scope_summary && credential.scope_summary.includes('mail.read') ) {
    Context.log('SyncGoogleMessages - Labels')

    const syncLabelsResult = await labelWorker.syncLabels(google, credential)
    if ( !syncLabelsResult.status ) {
      const message = 'Job Error - SyncGoogleMessages Failed [labels]'
      await handleException(userJob, message, syncLabelsResult.ex)
      return
    }

    Context.log('SyncGoogleMessages - Labels Done')
  }

  // Sync Messages
  if ( credential.scope_summary && credential.scope_summary.includes('mail.read') ) {

    const lastDailySync = credential.last_daily_sync ? new Date(credential.last_daily_sync) : new Date()
    const dailySyncGap  = new Date().getTime() - lastDailySync.getTime()
    
    dailySync = dailySyncGap > (24 * 60 * 60 * 1000)

    if (dailySync) {
      Context.log('SyncGoogleMessages - DailySync')
      await messagesFullSync(google, credential, userJob, true)

    } else {

      if (credential.messages_sync_history_id) {
  
        Context.log('SyncGoogleMessages - PartialSync')
        const partialSyncResult = await historyWorker.partialSync(google, credential)
  
        if ( partialSyncResult.needsFullSync ) {
  
          Context.log('SyncGoogleMessages - PartialSync Needs-FullSync')
          await messagesFullSync(google, credential, userJob, true)
  
        } else {
  
          if ( !partialSyncResult.status ) {
            const message = 'Job Error - SyncGoogleMessages Failed [partial-sync]'
            await handleException(userJob, message, partialSyncResult.ex)
            return
          }
          Context.log('SyncGoogleMessages - PartialSync')
        }
  
      } else {
  
        Context.log('SyncGoogleMessages - FullSync')
        await messagesFullSync(google, credential, userJob)
      }
    }

    // Handle MailBox Watcher
    await messageWorker.watchMailBox(google, credential)
    Context.log('SyncGoogleMessages WatchMailBox:', credential.id)
  }

  if (dailySync) {
    await GoogleCredential.updateLastDailySync(credential.id)
  }


  // Report success
  await updateJobStatus(userJob.id, 'success')

  Context.log('SyncGoogleMessages - Job Finished')
}


module.exports = {
  syncGmail
}