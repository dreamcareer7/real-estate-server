const Slack    = require('../../Slack')
const Context  = require('../../Context')
const config   = require('../../../config')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob/google')
const { updateStatus: updateJobStatus } = require('../../UsersJob/update')

const { getGoogleClient } = require('../plugin/client.js')
const { handleException, lockJob } = require('./helper')

const GoogleCredential = {
  ...require('../credential/get')
}

const contactGroupWorker = require('./contacts/contact_group')
const contactWorker      = require('./contacts/contact')

const JOB_NAME = 'contacts'



const syncContacts = async (data) => {
  const credential = await GoogleCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByGoogleCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByGoogleCredential(credential.id, JOB_NAME)
  if (!userJob) {
    // Context.log('SyncGoogleContacts - Job skipped due to a pending job')
    return
  }

  if (userJob.resume_at) {
    if ( new Date(userJob.resume_at).getTime() >= new Date().getTime() ) {
      Context.log('SyncGoogleContacts - Job skipped due to the paused job', credential.id)
      return
    }
  }

  /*
    check to know if current credential/job has already done ove the specific time period
    userJob === 'waiting' ==> It means user has clicked on sync-now buttun to start immediately sync process
    userJob !== 'waiting' ==> It means the job is started by system scheduler
  */
  const diff = new Date().getTime() - new Date(userJob.start_at).getTime()
  if ( (userJob.status !== 'waiting') && (diff < config.contacts_integration.miliSec) ) {
    // Context.log('SyncGoogleContacts - Job skipped due to recently finished job')
    return
  }

  await lockJob(credential, userJob)

  const google = await getGoogleClient(credential)
  if (!google) {
    Slack.send({ channel: 'integration_logs', text: `Google-Contacts Sync Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await updateJobStatus(userJob.id, 'failed')
    return
  }


  Context.log('SyncGoogleContacts - Job Started', credential.id, credential.email)


  const last_start_at = userJob.start_at ? new Date(userJob.start_at) : new Date(0)
  

  Context.log('SyncGoogleContacts - [Google To Rechat]')

  if ( credential.scope_summary && credential.scope_summary.includes('contacts.read') ) {

    const contactGroupsResult = await contactGroupWorker.syncContactGroups(google, credential)
    if ( !contactGroupsResult.status ) {
      const message = 'Job Error - SyncGoogleContacts Failed [Google To Rechat - groups]'
      await handleException(credential, userJob, message, contactGroupsResult.ex)
      return
    }
    Context.log('SyncGoogleContacts - [Google To Rechat] Contact-Groups Done')
  
    const contactsLastRsult = await contactWorker.syncContacts(google, credential, last_start_at)
    if ( !contactsLastRsult.status ) {
      const message = 'Job Error - SyncGoogleContacts Failed [Google To Rechat - contacts]'
      await handleException(credential, userJob, message, contactsLastRsult.ex)
      return
    }
    Context.log('SyncGoogleContacts - [Google To Rechat] Contacts Done')

    Socket.send('Google.Contacts.Imported', credential.user, [contactsLastRsult.createdNum])
  }


  // Update as Success
  await updateJobStatus(userJob.id, 'success')

  Context.log('SyncGoogleCalendar - Job Finished')
}


module.exports = {
  syncContacts
}