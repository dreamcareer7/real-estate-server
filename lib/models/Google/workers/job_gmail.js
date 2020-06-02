const Context  = require('../../Context')
const Slack    = require('../../Slack')
const UsersJob = require('../../UsersJob')

const messageWorker = require('./gmail/message')
const historyWorker = require('./gmail/history')
const labelWorker   = require('./gmail/label')

const { getGoogleClient } = require('../plugin/client.js')
const GoogleCredential    = require('../credential')



const handleException = async (credential, msg, ex) => {
  // invalid_grant => https://blog.timekit.io/google-oauth-invalid-grant-nightmare-and-how-to-fix-it-9f4efaf1da35
  // rate limit => https://developers.google.com/gmail/api/v1/reference/quota (ex.statusCode: 429)

  Context.log('SyncGoogleMessages handleException', msg, ex)

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    await GoogleCredential.disconnect(credential.id)
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Google-Messages Job postponed`
  const emoji = ':skull:'

  Slack.send({ channel: 'integration_logs', text, emoji })

  await UsersJob.upsertByGoogleCredential(credential, 'gmail', 'failed')

  return
}


const syncGmail = async (data) => {
  // check to know if credential is still active
  const credential = await GoogleCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByGoogleCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByGoogleCredential(credential.id, 'gmail')
  if (!userJob) {
    Context.log('SyncGoogleMessages - Job skipped due to a pending job', credential.id, credential.email)
    return
  }

  /*
    Lock users_jobs record

    select * from users_jobs where google_credential = credential.id AND job_name = 'gmail' FOR UPDATE;
    ==> lock will be released after commiting or rollbacking current transaction
  */
  await UsersJob.lockByGoogleCredential(credential.id, 'gmail')
  await UsersJob.upsertByGoogleCredential(credential, 'gmail', 'pending')

  // check google clients
  const google = await getGoogleClient(credential)
  if (!google) {
    Slack.send({ channel: 'integration_logs', text: `SyncGoogleMessages Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJob.upsertByGoogleCredential(credential, 'gmail', 'failed')
    return
  }


  Context.log('SyncGoogleMessages - Job Started', credential.id, credential.email)

  const start_at = new Date()
  let dailySync = false


  const messagesFullSync = async function(hasLostState = false) {
    const syncMessagesResult = await messageWorker.syncMessages(google, credential, hasLostState)
    if ( !syncMessagesResult.status ) {
      const message = 'Job Error - SyncGoogleMessages Failed [sync-messages]'
      await handleException(credential, message, syncMessagesResult.ex)
      return
    }
    Context.log('SyncGoogle - syncMessagesResult', credential.id, credential.email)
  }


  // Sync Labels
  if ( credential.scope_summary && credential.scope_summary.includes('mail.read') ) {
    Context.log('SyncGoogleMessages - Labels', credential.id, credential.email)

    const syncLabelsResult = await labelWorker.syncLabels(google, credential)
    if ( !syncLabelsResult.status ) {
      const message = 'Job Error - SyncGoogleMessages Failed [labels]'
      await handleException(credential, message, syncLabelsResult.ex)
      return
    }

    Context.log('SyncGoogleMessages - Labels done', credential.id, credential.email)
  }

  // Sync Messages
  if ( credential.scope_summary && credential.scope_summary.includes('mail.read') ) {

    const lastDailySync = credential.last_daily_sync ? new Date(credential.last_daily_sync) : new Date()
    const dailySyncGap  = new Date().getTime() - lastDailySync.getTime()
    
    dailySync = dailySyncGap > (24 * 60 * 60 * 1000)

    if (dailySync) {
      Context.log('SyncGoogleMessages - dailySync', credential.id, credential.email)
      await messagesFullSync(true)

    } else {

      if (credential.messages_sync_history_id) {
  
        Context.log('SyncGoogleMessages - partialSync', credential.id, credential.email)
        const partialSyncResult = await historyWorker.partialSync(google, credential)
  
        if ( partialSyncResult.needsFullSync ) {
  
          Context.log('SyncGoogleMessages - partialSync Needs-FullSync', credential.id, credential.email)
          await messagesFullSync(true)
  
        } else {
  
          if ( !partialSyncResult.status ) {
            const message = 'Job Error - SyncGoogleMessages Failed [partial-sync]'
            await handleException(credential, message, partialSyncResult.ex)
            return
          }
          Context.log('SyncGoogleMessages - partialSync', credential.id, credential.email)
        }
  
      } else {
  
        Context.log('SyncGoogleMessages - fullSync', credential.id, credential.email)
        await messagesFullSync()
      }
    }

    // Handle MailBox Watcher
    await messageWorker.watchMailBox(google, credential)
    Context.log('SyncGoogleMessages watchMailBox:', credential.id)
  }

  if (dailySync) {
    await GoogleCredential.updateLastDailySync(credential.id)
  }


  // Report success
  await UsersJob.upsertByGoogleCredential(credential, 'gmail', 'success')
  
  const sync_duration = new Date().getTime() - start_at.getTime()
  Context.log('SyncGoogleMessages - job Finished', credential.id, credential.email, sync_duration)

  return
}

const handleWebhooks = async (data) => {
  const result      = await GoogleCredential.getByEmail(data.key)
  const credentials = result.filter(c => (c.scope_summary && c.scope_summary.includes('mail.read') && !c.revoked && !c.deleted_at))

  for (const credential of credentials) {
    try {
      await UsersJob.forceSyncByGoogleCredential(credential.id, 'gmail')
    } catch (ex) {
      // do nothing
    }
  }

  return
}


module.exports = {
  syncGmail,
  handleWebhooks
}