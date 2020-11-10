const config   = require('../../../config')
const Context  = require('../../Context')
const Slack    = require('../../Slack')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob/google')

const { getGoogleClient } = require('../plugin/client.js')

const GoogleCredential = {
  ...require('../credential/get'),
  ...require('../credential/update')
}

const contactGroupWorker  = require('./contacts/contact_group')
const contactWorker       = require('./contacts/contact')



const handleException = async (credential, msg, ex) => {
  Context.log('SyncGoogleContacts HandleException', msg, ex)

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    await GoogleCredential.disconnect(credential.id)
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - StatusCode: ${ex.statusCode} - Message: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Google-Contact Job postponed`
  const emoji = ':skull:'

  Slack.send({ channel: 'integration_logs', text, emoji })

  await UsersJob.upsertByGoogleCredential(credential, 'contacts', 'failed')
}

const syncContacts = async (data) => {
  // check to know if credential is still active
  const credential = await GoogleCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByGoogleCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByGoogleCredential(credential.id, 'contacts')
  if (!userJob) {
    // Context.log('SyncGoogleContacts - Job skipped due to a pending job')
    return
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

  /*
    Lock users_jobs record

    select * from users_jobs where google_credential = credential.id AND job_name = 'contact' FOR UPDATE;
    ==> lock will be released after commiting or rollbacking current transaction
  */
  await UsersJob.lockByGoogleCredential(credential.id, 'contacts')
  await UsersJob.upsertByGoogleCredential(credential, 'contacts', 'pending')

  // check google clients
  const google = await getGoogleClient(credential)
  if (!google) {
    Slack.send({ channel: 'integration_logs', text: `Google-Contacts Sync Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJob.upsertByGoogleCredential(credential, 'contacts', 'failed')
    return
  }


  Context.log('SyncGoogleContacts - Job Started', credential.id, credential.email)


  const last_start_at = userJob.start_at ? new Date(userJob.start_at) : new Date(0)
  

  Context.log('SyncGoogleContacts - [Google To Rechat]')

  if ( credential.scope_summary && credential.scope_summary.includes('contacts.read') ) {

    const contactGroupsResult = await contactGroupWorker.syncContactGroups(google, credential)
    if ( !contactGroupsResult.status ) {
      const message = 'Job Error - SyncGoogleContacts Failed [Google To Rechat - groups]'
      await handleException(credential, message, contactGroupsResult.ex)
      return
    }
    Context.log('SyncGoogleContacts - [Google To Rechat] Contact-Groups Done')
  
    const contactsLastRsult = await contactWorker.syncContacts(google, credential, last_start_at)
    if ( !contactsLastRsult.status ) {
      const message = 'Job Error - SyncGoogleContacts Failed [Google To Rechat - contacts]'
      await handleException(credential, message, contactsLastRsult.ex)
      return
    }
    Context.log('SyncGoogleContacts - [Google To Rechat] Contacts Done')

    Socket.send('Google.Contacts.Imported', credential.user, [contactsLastRsult.createdNum])
  }


  // Update as Success
  await UsersJob.upsertByGoogleCredential(credential, 'contacts', 'success')

  Context.log('SyncGoogleCalendar - Job Finished')
}


module.exports = {
  syncContacts
}