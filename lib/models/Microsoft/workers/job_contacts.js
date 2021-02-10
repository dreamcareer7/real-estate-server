const Context  = require('../../Context')
const config   = require('../../../config')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { get } = require('../credential/get')
const { handleException, lockJob, microsoftClient } = require('./helper')

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

const insertContactAvatarJob = async (credential) => {
  const jobName    = 'contact_avatar'
  const status     = null
  const metadata   = null
  const recurrence = false

  const userJob = await UsersJob.find({ gcid: null, mcid: credential.id, jobName, metadata })

  if (!userJob) {
    return await UsersJob.upsertByMicrosoftCredential(credential, jobName, status, metadata, recurrence)
  }

  if ( userJob && userJob.deleted_at ) {
    return await UsersJob.restoreById(userJob.id)
  }
}

const handleSubscriptions = async (microsoft, credential, userJob) => {
  if ( !credential?.scope_summary?.includes('contacts.read') ) {
    return {
      status: true
    }
  }

  // Contacts Subscription
  return await subscriptionWorkers.handleSubscriptions(microsoft, credential)
}

const syncMicrosoftToRechat = async (microsoft, credential, userJob) => {
  if ( !credential?.scope_summary?.includes('contacts.read') ) {
    return {
      status: true
    }
  }

  const last_start_at = userJob.start_at ? new Date(userJob.start_at) : new Date(0)


  // Sync Contact-Folders
  const contactFoldersResult = await contactWorker.folders.syncContactFolders(microsoft, credential)

  if ( !contactFoldersResult.status && !contactFoldersResult.skip ) {
    return contactFoldersResult
  }


  // Sync Contacts
  return await contactWorker.contacts.syncContacts(microsoft, credential, last_start_at))
}

const syncRechatToMicrosoft = async (microsoft, credential, userJob) => {
  if ( !credential?.scope_summary?.includes('contacts.read') ) {
    return {
      status: true
    }
  }

  return {
    status: true,
    ex: null
  }
}

const extractContacts = async (microsoft, credential, userJob, origin) => {
  if ( !(credential.scope_summary.includes('mail.read') && (origin !== 'notifications')) ) {
    return {
      status: true
    }
  }

  if ( !credential?.scope_summary?.includes('contacts.read') ) {
    return {
      status: true
    }
  }

  const last_start_at = userJob.start_at ? new Date(userJob.start_at) : new Date(0)

  // Extract Contacts From Messages
  return await messageWorker.extractContacts(microsoft, credential, last_start_at)
}

const syncContactsNew = async (data) => {
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

  const microsoft = await microsoftClient(credential, userJob)
  if (!microsoft) {
    return
  }



  Context.log('SyncMicrosoftContacts - [Subscription]')
  const subscriptionResult = await handleSubscriptions(microsoft, credential, userJob)
  if ( !subscriptionResult.status && !subscriptionResult.skip ) {
    const message = 'Job Error - Microsoft Sync Failed [subscription]'
    await handleException(userJob, message, subscriptionResult.ex)
    return
  }


  Context.log('SyncMicrosoftContacts - [Microsoft To Rechat]')
  const microsoftToRechat = await syncMicrosoftToRechat(microsoft, credential, userJob)
  if ( !microsoftToRechat.status && !microsoftToRechat.skip ) {
    const message = 'Job Error - syncContacts Failed [Microsoft To Rechat]'
    await handleException(userJob, message, microsoftToRechat.ex)
    return
  }


  Context.log('SyncMicrosoftContacts - [extract-contacts]')
  const extractContactsResult = await extractContacts(microsoft, credential, userJob, data.origin)
  if ( !extractContactsResult.status && !extractContactsResult.skip ) {
    const message = 'Job Error - syncContacts Failed [extract-contacts]'
    await handleException(userJob, message, extractContactsResult.ex)
    return
  }


  Context.log('SyncMicrosoftContacts - [Rechat To Microsoft]')
  const rechatToMicrosoft = await syncRechatToMicrosoft(microsoft, credential, userJob)
  if ( !rechatToMicrosoft.status && !rechatToMicrosoft.skip ) {
    const message = 'Job Error - syncContacts Failed [Microsoft To Rechat]'
    await handleException(userJob, message, rechatToMicrosoft.ex)
    return
  }



  const sum = microsoftToRechat.upsertedNum + extractContactsResult.createdNum
  if (sum) {
    await insertContactAvatarJob(credential)
    Socket.send('Microsoft.Contacts.Imported', credential.user, [sum])
  }

  await updateJobStatus(userJob.id, 'success')

  Context.log('SyncMicrosoftContacts - Job Finished')
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

  const microsoft = await microsoftClient(credential, userJob)
  if (!microsoft) {
    return
  }


  Context.log('SyncMicrosoftContacts - Job Started', credential.id, credential.email)

  const last_start_at = userJob.start_at ? new Date(userJob.start_at) : new Date(0)
  let num_of_synced_contacts = 0
  let num_of_synced_other_contacts = 0


  // Sync Contact-Folders and Contacts
  if ( credential.scope_summary.includes('contacts.read') ) {
    const contactFoldersResult = await contactWorker.folders.syncContactFolders(microsoft, credential)
    if ( !contactFoldersResult.status && !contactFoldersResult.skip ) {
      const message = 'Job Error - Microsoft Sync Failed [contact-folders]'
      await handleException(userJob, message, contactFoldersResult.ex)
      return
    }


    const contactsResult = await contactWorker.contacts.syncContacts(microsoft, credential, last_start_at)
    if ( !contactsResult.status && !contactsResult.skip ) {
      const message = 'Job Error - Microsoft Sync Failed [contacts]'
      await handleException(userJob, message, contactsResult.ex)
      return
    }

    num_of_synced_contacts += (contactsResult.upsertedNum || 0)
  }

  // Contacts Subscription
  if ( credential.scope_summary.includes('contacts.read') ) {
    const subscriptionResult = await subscriptionWorkers.handleSubscriptions(microsoft, credential)

    if ( !subscriptionResult.status ) {
      const message = 'Job Error - Microsoft Sync Failed [subscription]'
      await handleException(userJob, message, subscriptionResult.ex)
      return
    }
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

      num_of_synced_other_contacts += (extractContactsResult.createdNum || 0)
    }
  }

  if (num_of_synced_contacts) {
    /* Create a job to download contacts' avatars */
    await insertContactAvatarJob(credential)
  }

  const sum = num_of_synced_contacts + num_of_synced_other_contacts
  if (sum) {
    Socket.send('Microsoft.Contacts.Imported', credential.user, [sum])
  }

  await updateJobStatus(userJob.id, 'success')

  Context.log('SyncMicrosoftContacts - Job Finished')
}


module.exports = {
  syncContactsNew,
  syncContacts
}