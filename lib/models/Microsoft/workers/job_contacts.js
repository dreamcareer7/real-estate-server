const Slack    = require('../../Slack')
const Context  = require('../../Context')
const config   = require('../../../config')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { get } = require('../credential/get')
const { getMGraphClient } = require('../plugin/client.js')
const { handleException, lockJob } = require('./helper')

const contactWorker = require('./contacts')
const messageWorker = require('./outlook')
const subscriptionWorkers = require('./subscriptions/contacts')

const JOB_NAME = 'contacts'



const skipJob = (userJob, origin) => {
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
  if ( (userJob.status !== 'waiting') && (diff < config.contacts_integration.miliSec) && (origin !== 'notifications') ) {
    // Context.log('SyncMicrosoftContacts - Job skipped due to recently finished job')
    return true
  }

  return false
}

const syncContacts = async (data) => {
  const credential = await get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByMicrosoftCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByMicrosoftCredential(credential.id, JOB_NAME)
  if (!userJob) {
    return
  }

  if (skipJob(userJob, data.origin)) {
    return
  }

  await lockJob(userJob)

  const { microsoft } = await getMGraphClient(credential)
  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: `SyncMicrosoftContacts Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await updateJobStatus(userJob.id, 'failed')
    return
  }


  Context.log('SyncMicrosoftContacts - Job Started', credential.id, credential.email)

  const last_start_at = userJob.start_at ? new Date(userJob.start_at) : new Date(0)
  let synced_contacts_num = 0


  // Sync Contact-Folders and Contacts
  if ( credential.scope_summary.includes('contacts.read') ) {
    const contactFoldersResult = await contactWorker.folders.syncContactFolders(microsoft, credential)
    if ( !contactFoldersResult.status && !contactFoldersResult.skip ) {
      const message = 'Job Error - Microsoft Sync Failed [contact-folders]'
      await handleException(userJob, message, contactFoldersResult.ex)
      return
    }

    Context.log('SyncMicrosoftContacts - Contact-Folders')


    const contactsRsult = await contactWorker.contacts.syncContacts(microsoft, credential, last_start_at)
    if ( !contactsRsult.status && !contactsRsult.skip ) {
      const message = 'Job Error - Microsoft Sync Failed [contacts]'
      await handleException(userJob, message, contactsRsult.ex)
      return
    }

    Context.log('SyncMicrosoftContacts - [Microsoft To Rechat] Contacts')

    synced_contacts_num += (contactsRsult.createdNum || 0)
  }

  // Contacts Subscription
  if ( credential.scope_summary.includes('contacts.read') ) {
    const subscriptionResult = await subscriptionWorkers.handleSubscriptions(microsoft, credential)

    if ( !subscriptionResult.status ) {
      const message = 'Job Error - Microsoft Sync Failed [subscription]'
      await handleException(userJob, message, subscriptionResult.ex)
      return
    }

    Context.log('SyncMicrosoftContacts Subscription')
  }

  // Extract Contacts From Messages
  if ( credential.scope_summary.includes('mail.read') && (data.origin !== 'notifications') ) {

    if ( credential.scope_summary.includes('contacts.read') ) {
      const extractContactsResult = await messageWorker.extractContacts(microsoft, credential, last_start_at)

      if ( !extractContactsResult.status && !extractContactsResult.skip ) {
        const message = 'Job Error - Microsoft Sync Failed [extract-contacts]'
        await handleException(userJob, message, extractContactsResult.ex)
        return
      }

      Context.log('SyncMicrosoftContacts - [Microsoft To Rechat] Extract-Contacts')

      synced_contacts_num += (extractContactsResult.createdNum || 0)
    }
  }

  Socket.send('Microsoft.Contacts.Imported', credential.user, [synced_contacts_num])
  await updateJobStatus(userJob.id, 'success')

  Context.log('SyncMicrosoftContacts - Job Finished')
}


module.exports = {
  syncContacts
}