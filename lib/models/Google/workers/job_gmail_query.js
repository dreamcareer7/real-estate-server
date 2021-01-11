const UsersJob = require('../../UsersJob/google')
const Socket   = require('../../Socket')

const { deleteById } = require('../../UsersJob/delete')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')
const { checkLock } = require('../../UsersJob/lock')

const GoogleCredential = require('../credential/get')
const Gmail = require('../gmail')

const { handleException, lockJob, googleClient } = require('./helper')
const { syncByIds } = require('./gmail/message')

// const JOB_NAME = 'gmail_query'



const skipJob = (userJob) => {
  if (!userJob?.metadata?.contact_address) {
    return true
  }

  if ( userJob.deleted_at || (userJob.status === 'success') ) {
    return true
  }

  if ( userJob.resume_at && (new Date(userJob.resume_at).getTime() >= new Date().getTime()) ) {
    return true
  }

  return false
}

const syncGmailByQuery = async (data) => {
  const credential = await GoogleCredential.get(data.google_credential)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByGoogleCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await checkLock(data.id)
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


  try {

    const messageIds = await Gmail.searchByContact(credential.id, data.metadata.contact_address)
    const result     = await syncByIds(google, credential, messageIds)


    if ( !result.status ) {
      const message = 'Job Error - syncGmailByQuery Failed [syncByIds]'
      await handleException(userJob, message, result.ex)
      return
    }

    // Report success
    await updateJobStatus(userJob.id, 'success')
    await deleteById(userJob.id)

    Socket.send('Google.Gmail.SyncedByQuery', credential.user, [])

  } catch (ex) {

    const message = 'Job Error - SyncGmailByQuery Failed'
    await handleException(userJob, message, ex)
    return
  }
}


module.exports = {
  syncGmailByQuery
}