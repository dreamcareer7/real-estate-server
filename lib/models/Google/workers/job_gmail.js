const Context  = require('../../Context')
const Slack    = require('../../Slack')
const UsersJob = require('../../UsersJob/google')

const GoogleCredential = {
  ...require('../credential/get'),
  ...require('../credential/update')
}

const { getGoogleClient } = require('../plugin/client.js')

const messageWorker = require('./gmail/message')
const historyWorker = require('./gmail/history')
const labelWorker   = require('./gmail/label')



const postpone = async (credential, ex) => {
  let interval = '5 minutes'

  if ( ex.statusCode === 429 ) {
    interval = '30 minutes'
  }

  const fiveXErr = [500, 501, 502, 503, 504]

  if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {
    interval = '10 minutes'
  }

  await UsersJob.postponeByGoogleCredential(credential, 'gmail', interval)
}

const handleException = async (credential, msg, ex) => {
  // invalid_grant => https://blog.timekit.io/google-oauth-invalid-grant-nightmare-and-how-to-fix-it-9f4efaf1da35
  // rate limit => https://developers.google.com/gmail/api/v1/reference/quota (ex.statusCode: 429)

  Context.log('SyncGoogleMessages HandleException', msg, ex)

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    await GoogleCredential.disconnect(credential.id)
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - StatusCode: ${ex.statusCode} - Message: ${ex.message} - Info: ${JSON.stringify(obj)}`
  const emoji = ':skull:'

  Slack.send({ channel: 'integration_logs', text, emoji })

  await UsersJob.upsertByGoogleCredential(credential, 'gmail', 'failed')
  await postpone(credential, ex)
}

const messagesFullSync = async function(google, credential, hasLostState = false) {
  const syncMessagesResult = await messageWorker.syncMessages(google, credential, hasLostState)
  if ( !syncMessagesResult.status ) {
    const message = 'Job Error - SyncGoogleMessages Failed [sync-messages]'
    await handleException(credential, message, syncMessagesResult.ex)
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
  const userJob = await UsersJob.checkLockByGoogleCredential(credential.id, 'gmail')
  if (!userJob) {
    // Context.log('SyncGoogleMessages - Job skipped due to a pending job')
    return
  }

  // check to know if current credential/job has already done ove the specific time period, Its disabled Becaus of supporting the real time sync.
  // const diff = new Date().getTime() - new Date(userJob.start_at).getTime()
  // if ( diff < config.emails_integration.miliSec ) {
  //   return
  // }

  /*
    check to know if current credential/job has already done ove the specific time period.
    *** Its disabled Because of supporting the real time sync.

    const diff = new Date().getTime() - new Date(userJob.start_at).getTime()
    if ( diff < config.emails_integration.miliSec ) {
      return
    }
  */

  /*
    Lock users_jobs record

    select * from users_jobs where google_credential = credential.id AND job_name = 'gmail' FOR UPDATE;
    ==> lock will be released after commiting or rollbacking current transaction
  */
  await UsersJob.lockByGoogleCredential(credential.id, 'gmail')
  await UsersJob.upsertByGoogleCredential(credential, 'gmail', 'pending')

  const google = await getGoogleClient(credential)
  if (!google) {
    Slack.send({ channel: 'integration_logs', text: `SyncGoogleMessages Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJob.upsertByGoogleCredential(credential, 'gmail', 'failed')
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
      await handleException(credential, message, syncLabelsResult.ex)
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
      await messagesFullSync(google, credential, true)

    } else {

      if (credential.messages_sync_history_id) {
  
        Context.log('SyncGoogleMessages - PartialSync')
        const partialSyncResult = await historyWorker.partialSync(google, credential)
  
        if ( partialSyncResult.needsFullSync ) {
  
          Context.log('SyncGoogleMessages - PartialSync Needs-FullSync')
          await messagesFullSync(google, credential, true)
  
        } else {
  
          if ( !partialSyncResult.status ) {
            const message = 'Job Error - SyncGoogleMessages Failed [partial-sync]'
            await handleException(credential, message, partialSyncResult.ex)
            return
          }
          Context.log('SyncGoogleMessages - PartialSync')
        }
  
      } else {
  
        Context.log('SyncGoogleMessages - FullSync')
        await messagesFullSync(google, credential)
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
  await UsersJob.upsertByGoogleCredential(credential, 'gmail', 'success')

  Context.log('SyncGoogleMessages - Job Finished')
}


module.exports = {
  syncGmail
}