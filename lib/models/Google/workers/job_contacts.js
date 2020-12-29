const Context  = require('../../Context')
const config   = require('../../../config')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { handleException, lockJob, googleClient } = require('./helper')

const GoogleCredential = require('../credential/get')

const { syncContactGroups } = require('./contacts/groups/')
const { syncPeople }        = require('./contacts/people/people')

const JOB_NAME = 'contacts'



const skipJob = (userJob) => {
  if (userJob.deleted_at) {
    return true
  }

  // if ( userJob.resume_at && (new Date(userJob.resume_at).getTime() >= new Date().getTime()) ) {
  //   return true
  // }

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
  let synced_contacts_num = 0

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
    return
  }

  await lockJob(userJob)

  const google = await googleClient(credential, userJob)
  if (!google) {
    return
  }


  Context.log('SyncGoogleContacts - Job Started', credential.id, credential.email)

  // Contact Groups
  if ( credential?.scope_summary?.includes('contacts.read') ) {
    const result = await syncContactGroups(google, credential)

    if ( !result.status ) {
      const message = 'Job Error - SyncGoogleContacts Failed [Google To Rechat - groups]'
      await handleException(userJob, message, result.ex)
      return
    }
  }

  // People [Google To Rechat]
  if ( credential?.scope_summary?.includes('contacts.read') ) {
    const result = await syncPeople(google, credential)

    if ( !result.status ) {
      const message = 'Job Error - syncPeople Failed [Google To Rechat]'
      await handleException(userJob, message, result.ex)
      return
    }

    synced_contacts_num += (result.createdNum || 0)
  }

  // People [Rechat To Google]
  if ( credential?.scope_summary?.includes('contacts.write') ) {
    const result = await syncPeople(google, credential)

    if ( !result.status ) {
      const message = 'Job Error - syncPeople Failed [Rechat To Google]'
      await handleException(userJob, message, result.ex)
      return
    }
  }

  if (synced_contacts_num) {
    /* Create a job to download contacts' avatars */
    await insertContactAvatarJob(credential)

    Socket.send('Google.Contacts.Imported', credential.user, [synced_contacts_num])
  }

  await updateJobStatus(userJob.id, 'success')

  Context.log('SyncGoogleContacts - Job Finished')
}


module.exports = {
  insertContactAvatarJob,
  syncContacts
}