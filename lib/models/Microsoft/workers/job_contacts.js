const Context  = require('../../Context')
const config   = require('../../../config')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { get } = require('../credential/get')
const { handleException, lockJob, microsoftClient } = require('./helper')

const { microsoftToRechat, rechatToMicrosoft } = require('./contacts/people')
const { manageSubscriptions } = require('./subscriptions/contacts')
const { syncContactFolders }  = require('./contacts/folders')
// const { extractContacts }  = require('./outlook/contacts')

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

const handleSubscriptions = async (microsoft, credential) => {
  if ( !credential?.scope_summary?.includes('contacts.read') ) {
    return {
      status: true
    }
  }

  // Contacts Subscription
  return await manageSubscriptions(microsoft, credential)
}

const syncMicrosoftToRechat = async (microsoft, credential) => {
  if ( !credential?.scope_summary?.includes('contacts.read') && !credential?.scope_summary?.includes('contacts') ) {
    return {
      status: true
    }
  }

  // Sync Contact-Folders
  const contactFoldersResult = await syncContactFolders(microsoft, credential)

  if ( !contactFoldersResult.status && !contactFoldersResult.skip ) {
    return contactFoldersResult
  }

  // Sync Contacts
  return await microsoftToRechat(microsoft, credential)
}

const syncRechatToMicrosoft = async (microsoft, credential, userJob) => {
  if ( !credential?.scope_summary?.includes('contacts') ) {
    return {
      status: true
    }
  }

  // this is a temporary check.
  if ( !credential.people_apis_enabled ) {
    return {
      status: true
    }
  }


  // Every time user reconnects his account, the userJob.start_at will be set as NULL
  const last_start_at   = new Date(userJob?.start_at || 1) // initial last_start_at cannnot be zero!
  const last_updated_gt = last_start_at.getTime() / 1000

  return await rechatToMicrosoft(microsoft, credential, last_updated_gt)
}

const handleOtherContacts = async (microsoft, credential, userJob, origin) => {
  return {
    status: true
  }

  /*
  This method is temporary disabled due to lack of having an unique and standard id for extracted contacts.
  We need to think more about this problem.

  if ( !credential?.scope_summary?.includes('contacts.read') && !credential?.scope_summary?.includes('contacts') ) {
    return {
      status: true
    }
  }

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
  return await extractContacts(microsoft, credential, last_start_at)
  */
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



  Context.log('SyncMicrosoftContacts - [Subscription]')
  const subscriptionResult = await handleSubscriptions(microsoft, credential)
  if ( !subscriptionResult.status && !subscriptionResult.skip ) {
    const message = 'Job Error - Microsoft Sync Failed [subscription]'
    await handleException(userJob, message, subscriptionResult.ex)
    return
  }


  Context.log('SyncMicrosoftContacts - [Microsoft To Rechat]')
  const microsoftToRechat = await syncMicrosoftToRechat(microsoft, credential)
  if ( !microsoftToRechat.status && !microsoftToRechat.skip ) {
    const message = 'Job Error - syncContacts Failed [Microsoft To Rechat]'
    await handleException(userJob, message, microsoftToRechat.ex)
    return
  }

  if (microsoftToRechat.upsertedNum) {
    await insertContactAvatarJob(credential)
    Socket.send('Microsoft.Contacts.Imported', credential.user, [microsoftToRechat.upsertedNum])
  }


  Context.log('SyncMicrosoftContacts - [extract-contacts]')
  const otherContactsResult = await handleOtherContacts(microsoft, credential, userJob, data.origin)
  if ( !otherContactsResult.status && !otherContactsResult.skip ) {
    const message = 'Job Error - syncContacts Failed [extract-contacts]'
    await handleException(userJob, message, otherContactsResult.ex)
    return
  }


  Context.log('SyncMicrosoftContacts - [Rechat To Microsoft]')
  const rechatToMicrosoft = await syncRechatToMicrosoft(microsoft, credential, userJob)
  if ( !rechatToMicrosoft.status && !rechatToMicrosoft.skip ) {
    const message = 'Job Error - syncContacts Failed [Rechat To Microsoft]'
    await handleException(userJob, message, rechatToMicrosoft.ex)
    return
  }



  await updateJobStatus(userJob.id, 'success')

  Context.log('SyncMicrosoftContacts - Job Finished')
}


module.exports = {
  syncContacts
}
