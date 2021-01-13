const Context  = require('../../Context')
const config   = require('../../../config')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob')
const GoogleCredential = require('../credential/get')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { handleException, lockJob, googleClient } = require('./helper')
const { syncContactGroups } = require('./contacts/groups/')
const { googleToRechat, rechatToGoogle } = require('./contacts/people')

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

const syncGoogleToRechat = async (google, credential, userJob) => {
  // This is temporary hack to monitor production users
  if ( !credential.people_apis_enabled ) {
    return {
      status: true,
      createdNum: 0
    }
  }

  // Contact Groups
  if ( credential?.scope_summary?.includes('contacts.read') || credential?.scope_summary?.includes('contacts') ) {
    const result = await syncContactGroups(google, credential)

    if (!result.status) {
      return result
    }
  }

  // People [Google To Rechat]
  if ( credential?.scope_summary?.includes('contacts.read') || credential?.scope_summary?.includes('contacts') ) {
    const result =  await googleToRechat(google, credential)

    if (!result.status) {
      return result
    }
  }

  return {
    status: true,
    createdNum: 0
  }
}

const syncRechatToGoogle = async (google, credential, userJob) => {
  // This is temporary hack to monitor production users
  if ( !credential.people_apis_enabled ) {
    return {
      status: true,
      createdNum: 0
    }
  }

  userJob.start_at = null // This is a temporary config

  const last_start_at   = userJob.start_at ? new Date(userJob.start_at) : new Date(1) // initial last_start_at cannnot be zero!
  const last_updated_gt = last_start_at.getTime() / 1000
  
  if ( credential?.scope_summary?.includes('contacts') ) {
    return await rechatToGoogle(google, credential, last_updated_gt)
  }

  return {
    status: true,
    ex: null
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



  Context.log('SyncGoogleContacts - [Google To Rechat]')
  const googleToRechat = await syncGoogleToRechat(google, credential, userJob)
  if ( !googleToRechat.status ) {
    const message = 'Job Error - syncPeople Failed [Google To Rechat]'
    await handleException(userJob, message, googleToRechat.ex)
    return
  }

  if (googleToRechat.createdNum) {
    /* Create a job to download contacts' avatars */
    await insertContactAvatarJob(credential)
    Socket.send('Google.Contacts.Imported', credential.user, [googleToRechat.createdNum])
  }


  Context.log('SyncGoogleContacts - [Rechat To Google]')
  const rechatToGoogle = await syncRechatToGoogle(google, credential, userJob)
  if ( !rechatToGoogle.status ) {
    const message = 'Job Error - syncPeople Failed [Rechat To Google]'
    await handleException(userJob, message, rechatToGoogle.ex)
    return
  }


  await updateJobStatus(userJob.id, 'success')

  Context.log('SyncGoogleContacts - Job Finished')
}


module.exports = {
  insertContactAvatarJob,
  syncContacts
}