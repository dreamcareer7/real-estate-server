const { getMGraphClient } = require('../plugin/client.js')

const Context  = require('../../Context')
const Slack    = require('../../Slack')
const Socket   = require('../../Socket')
const UsersJob = require('../../UsersJob')

const contactWorker       = require('./contacts')
const messageWorker       = require('./outlook')
const MicrosoftCredential = require('../credential')



const handleException = async (credential, msg, ex) => {
  Context.log('SyncMicrosoftContacts handleException', msg, ex)

  let invalidGrant = false

  if ( ex.message === 'invalid_grant' ) {
    invalidGrant = true
  }

  if (ex.response) {
    if (ex.response.body) {
      const body = JSON.parse(ex.response.body)

      if ( body.error === 'invalid_grant' ) {
        invalidGrant = true
      }
    }
  }

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    invalidGrant = true
  }

  if (invalidGrant) {
    await MicrosoftCredential.disconnect(credential.id)
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Microsoft-Calendar Job postponed`
  const emoji = ':skull:'

  Slack.send({ channel: 'integration_logs', text, emoji })

  await UsersJob.upsertByMicrosoftCredential(credential, 'contacts', 'failed')

  return
}

const syncContacts = async (data) => {
  // check to know if credential is still active
  const credential = await MicrosoftCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByMicrosoftCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByMicrosoftCredential(credential.id, 'contacts')
  if (!userJob) {
    Context.log('SyncMicrosoftContacts - Job skipped due to a pending job', credential.id, credential.email)
    return
  }

  /*
    Lock users_jobs record

    select * from users_jobs where microsoft_credential = credential.id AND job_name = 'contacts' FOR UPDATE;
    ==> lock will be released after commiting or rollbacking current transaction
  */
  await UsersJob.lockByMicrosoftCredential(credential.id, 'contacts')
  await UsersJob.upsertByMicrosoftCredential(credential, 'contacts', 'pending')

  // check microsoft clients
  const { microsoft } = await getMGraphClient(credential)
  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: `SyncMicrosoftContacts Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJob.upsertByMicrosoftCredential(credential, 'contacts', 'failed')
    return
  }


  Context.log('SyncMicrosoftContacts - Job Started', credential.id, credential.email)


  const start_at      = new Date()
  const last_start_at = userJob.start_at ? new Date(userJob.start_at) : new Date(0)

  let synced_contacts_num = 0


  Context.log('SyncMicrosoftContacts - [Microsoft To Rechat]', credential.id, credential.email)

  // Sync Contact-Folders and Contacts
  if ( credential.scope_summary.includes('contacts.read') ) {
    const contactFoldersResult = await contactWorker.folders.syncContactFolders(microsoft, credential)

    if ( !contactFoldersResult.status && !contactFoldersResult.skip ) {
      const message = 'Job Error - Microsoft Sync Failed [contact-folders]'
      await handleException(credential, message, contactFoldersResult.ex)
      return
    }

    Context.log('SyncMicrosoftContacts - [Microsoft To Rechat] Contact-Folders', credential.id, credential.email)


    const contactsRsult = await contactWorker.contacts.syncContacts(microsoft, credential, last_start_at)

    if ( !contactsRsult.status && !contactsRsult.skip ) {
      const message = 'Job Error - Microsoft Sync Failed [contacts]'
      await handleException(credential, message, contactsRsult.ex)
      return
    }

    Context.log('SyncMicrosoftContacts - [Microsoft To Rechat] Contacts', credential.id, credential.email)

    synced_contacts_num += (contactsRsult.createdNum || 0)
  }


  // Extract Contacts, Sync Messages
  if ( credential.scope_summary.includes('mail.read') ) {

    if ( credential.scope_summary.includes('contacts.read') ) {
      const extractContactsResult = await messageWorker.extractContacts(microsoft, credential, last_start_at)

      if ( !extractContactsResult.status && !extractContactsResult.skip ) {
        const message = 'Job Error - Microsoft Sync Failed [extract-contacts]'
        await handleException(credential, message, extractContactsResult.ex)
        return
      }

      Context.log('SyncMicrosoftContacts - [Microsoft To Rechat] Extract-Contacts', credential.id, credential.email)

      synced_contacts_num += (extractContactsResult.createdNum || 0)
    }
  }

  Socket.send('Microsoft.Contacts.Imported', credential.user, [synced_contacts_num])


  // Update as Success
  await UsersJob.upsertByMicrosoftCredential(credential, 'contacts', 'success')

  const sync_duration = new Date().getTime() - start_at.getTime()
  Context.log('SyncMicrosoftContacts - Job Finished', credential.email, sync_duration)

  return
}



module.exports = {
  syncContacts
}