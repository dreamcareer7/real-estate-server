const Context  = require('../../Context')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob')
const GoogleCredential = require('../credential/get')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { handleException, lockJob, googleClient } = require('./helper')
// eslint-disable-next-line
const { syncContactGroups } = require('./contacts/groups/')
// const { googleToRechat, rechatToGoogle } = require('./contacts/people')
// eslint-disable-next-line
const { googleToRechat } = require('./contacts/people')


const JOB_NAME = 'contacts'



const skipJob = (userJob) => {
  if (userJob.deleted_at) {
    return true
  }

  if ( userJob.resume_at && (new Date(userJob.resume_at).getTime() >= new Date().getTime()) ) {
    return true
  }

  return false
}

const insertContactAvatarJob = async (credential) => {
  const jobName    = 'contact_avatar'
  const status     = 'waiting'
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
  if ( !credential?.scope_summary?.includes('contacts.read') && !credential?.scope_summary?.includes('contacts') ) {
    return {
      status: true
    }
  }

  // Contact Groups
  const cGroupResult = await syncContactGroups(google, credential)
  if (!cGroupResult.status) {
    return cGroupResult
  }

  // People [Google To Rechat]
  return await googleToRechat(google, credential)
}

const syncRechatToGoogle = async (google, credential, userJob) => {
  // this is a temporary check.
  return {
    status: true
  }

  /*
  if ( !credential?.scope_summary?.includes('contacts') ) {
    return {
      status: true
    }
  }

  // Every time user reconnects his account, the userJob.start_at will be set as NULL
  const last_start_at   = userJob.start_at ? new Date(userJob.start_at) : new Date(1) // initial last_start_at cannnot be zero!
  const last_updated_gt = last_start_at.getTime() / 1000

  return await rechatToGoogle(google, credential, last_updated_gt)
  */
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
    Context.log('SyncGoogleContacts - Skip')
    await updateJobStatus(userJob.id, 'waiting')
    return
  }

  await lockJob(userJob)

  const google = await googleClient(credential, userJob)
  if (!google) {
    await updateJobStatus(userJob.id, 'failed')
    return
  }


  const googleToRechat = await syncGoogleToRechat(google, credential, userJob)
  if ( !googleToRechat.status ) {
    const message = 'Job Error - syncPeople Failed [Google To Rechat]'
    await handleException(userJob, message, googleToRechat.ex)
    return
  }

  if (googleToRechat.upsertedNum) {
    /* Create a job to download contacts' avatars */
    await insertContactAvatarJob(credential)
    Socket.send('Google.Contacts.Imported', credential.user, [googleToRechat.upsertedNum])
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
