const Context  = require('../../Context')
const UsersJob = require('../../UsersJob')
const { deleteById } = require('../../UsersJob/delete')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { get } = require('../credential/get')
const { handleException, lockJob, microsoftClient } = require('./helper')

const { syncAvatars } = require('./contacts/contacts')

const JOB_NAME = 'contact_avatar'



const skipJob = (userJob) => {
  if (userJob.deleted_at) {
    return true
  }

  if ( userJob.resume_at && (new Date(userJob.resume_at).getTime() >= new Date().getTime()) ) {
    return true
  }

  return false
}

const syncContactsAvatars = async (data) => {
  Context.log('Microsoft syncContactsAvatars', data)
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

  if (skipJob(userJob)) {
    return
  }

  await lockJob(userJob)

  const microsoft = await microsoftClient(credential, userJob)
  if (!microsoft) {
    return
  }


  try {
    Context.log('SyncMicrosoftContactsAvatars - Job Started', credential.id, credential.email)

    const result = await syncAvatars(microsoft, credential)

    if ( !result.status ) {
      const message = 'Job Error - SyncMicrosoftContactsAvatars Failed'
      await handleException(userJob, message, result.ex)
      return
    }

    // Report success
    await updateJobStatus(userJob.id, 'success')
    await deleteById(userJob.id)

    Context.log('SyncMicrosoftContactsAvatars - Job Finished')

  } catch (ex) {

    const message = 'Job Error - SyncMicrosoftContactsAvatars Failed'
    await handleException(userJob, message, ex)
    return
  }
}


module.exports = {
  syncContactsAvatars
}