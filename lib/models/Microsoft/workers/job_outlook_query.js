const Slack    = require('../../Slack')
const UsersJob = require('../../UsersJob/microsoft')
const Socket   = require('../../Socket')

const { deletebyId } = require('../../UsersJob/delete')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')
const { checkLock } = require('../../UsersJob/lock')

const MicrosoftCredential = require('../credential/get')
const { getMGraphClient } = require('../plugin/client.js')
const Outlook = require('../outlook')

const { handleException, lockJob } = require('./helper')
const { syncByIds } = require('./outlook/messages')

// const JOB_NAME = 'outlook_query'



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

const syncOutlookByQuery = async (data) => {
  const credential = await MicrosoftCredential.get(data.microsoft_credential)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByMicrosoftCredential(credential.id)
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

  const { microsoft } = await getMGraphClient(credential)
  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: `syncOutlookByQuery Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await updateJobStatus(userJob.id, 'failed')
    return
  }


  try {

    const messageIds = await Outlook.searchByContact(credential.id, data.metadata.contact_address)
    const result     = await syncByIds(microsoft, credential, messageIds)

    if ( !result.status ) {
      const message = 'Job Error - syncOutlookByQuery Failed [syncByIds]'
      await handleException(userJob, message, result.ex)
      return
    }

    // Report success
    await updateJobStatus(userJob.id, 'success')
    await deletebyId(userJob.id)

    Socket.send('Microsoft.Outlook.SyncedByQuery', credential.user, [])

  } catch (ex) {

    const message = 'Job Error - SyncOutlookByQuery Failed'
    await handleException(userJob, message, ex)
    return
  }
}


module.exports = {
  syncOutlookByQuery
}