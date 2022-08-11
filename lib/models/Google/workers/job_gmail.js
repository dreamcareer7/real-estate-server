const Context  = require('../../Context')
const UsersJob = require('../../UsersJob/google')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const GoogleCredential = {
  ...require('../credential/get'),
  ...require('../credential/update')
}

const { handleException, lockJob, googleClient } = require('./helper')

const messageWorker = require('./gmail/message')
const historyWorker = require('./gmail/history')
const labelWorker   = require('./gmail/label')

const JOB_NAME = 'gmail'



const skipJob = (userJob) => {
  if (userJob.deleted_at) {
    return true
  }

  if ( userJob.resume_at && (new Date(userJob.resume_at).getTime() >= new Date().getTime()) ) {
    return true
  }

  return false
}

const messagesFullSync = async function(google, credential, userJob, state = false) {
  const syncMessagesResult = await messageWorker.syncMessages(google, credential, state)

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
    return
  }

  if (skipJob(userJob)) {
    await updateJobStatus(userJob.id, 'waiting')
    return
  }

  await lockJob(userJob)

  const google = await googleClient(credential, userJob)
  if (!google) {
    return
  }


  Context.log('SyncGoogleMessages - Job Started', credential.id, credential.email)

  let dailySync = false


  // Sync Labels
  if ( credential.scope_summary && credential.scope_summary.includes('mail.read') ) {
    const syncLabelsResult = await labelWorker.syncLabels(google, credential)
    if ( !syncLabelsResult.status ) {
      const message = 'Job Error - SyncGoogleMessages Failed [labels]'
      await handleException(userJob, message, syncLabelsResult.ex)
      return
    }
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
  
        Context.log('SyncGoogleMessages - PartialSync Started')
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
          Context.log('SyncGoogleMessages - PartialSync Done')
        }
  
      } else {
  
        Context.log('SyncGoogleMessages - FullSync')
        await messagesFullSync(google, credential, userJob)
      }
    }

    
    try {
      await messageWorker.watchMailBox(google, credential)
    } catch (ex) {
      const message = 'Job Error - WatchGmailMailBox Failed'
      return await handleException(userJob, message, ex)
    }
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