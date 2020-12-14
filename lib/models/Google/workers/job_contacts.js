const Context  = require('../../Context')
const config   = require('../../../config')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { handleException, lockJob, googleClient } = require('./helper')

const GoogleCredential = {
  ...require('../credential/get'),
  ...require('../credential/update')
}

const contactGroupWorker = require('./contacts/contact_group')
const contactWorker      = require('./contacts/contact')

const JOB_NAME = 'contacts'



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
  if ( (userJob.status !== 'waiting') && (diff < config.contacts_integration.miliSec) ) {
    return
  }

  return false
}

const insertContactAvatarJob = async (credential) => {
  const jobName    = 'contact_avatar'
  const status     = null
  const metadata   = null
  const recurrence = false

  const userJob = await UsersJob.find({ gcid: credential.id, mcid: null, jobName, metadata })

  if (!userJob) {
    return await UsersJob.upsertByGoogleCredential(credential, jobName, status, metadata, recurrence)
  }

  if ( userJob && userJob.deleted_at ) {
    return await UsersJob.restoreById(userJob.id)
  }
}

const syncContacts = async (data) => {
  const credential = await GoogleCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByGoogleCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByGoogleCredential(credential.id, JOB_NAME)
  if (!userJob) {
    // return
  }

  // if (skipJob(userJob)) {
  //   return
  // }

  // await lockJob(userJob)

  const google = await googleClient(credential, userJob)
  if (!google) {
    return
  }


  Context.log('SyncGoogleContacts - Job Started', credential.id, credential.email)

  let num_of_synced_contacts = 0


  if ( credential.scope_summary && credential.scope_summary.includes('contacts.read') ) {

    const contactGroupsResult = await contactGroupWorker.syncContactGroups(google, credential)
    if ( !contactGroupsResult.status ) {
      const message = 'Job Error - SyncGoogleContacts Failed [Google To Rechat - groups]'
      await handleException(userJob, message, contactGroupsResult.ex)
      return
    }

    if (contactGroupsResult.nextSyncToken) {
      await GoogleCredential.updateContactGroupsSyncToken(credential.id, contactGroupsResult.nextSyncToken)
    }


    const contactsResult = await contactWorker.syncContacts(google, credential)
    if ( !contactsResult.status ) {
      const message = 'Job Error - SyncGoogleContacts Failed [Google To Rechat - contacts]'
      await handleException(userJob, message, contactsResult.ex)
      return
    }

    if (contactGroupsResult.nextSyncToken) {
      await GoogleCredential.updateContactsSyncToken(credential.id, contactsResult.nextSyncToken)
    }

    num_of_synced_contacts = contactsResult.createdNum || 0
  }


  if (num_of_synced_contacts) {
    /* Create a job to download contacts' avatars */
    // await insertContactAvatarJob(credential)

    Socket.send('Google.Contacts.Imported', credential.user, [num_of_synced_contacts])
  }

  await updateJobStatus(userJob.id, 'success')

  Context.log('SyncGoogleContacts - Job Finished')
}


module.exports = {
  syncContacts
}