const { getMGraphClient } = require('../plugin/client.js')

const Context = require('../../Context')
const Slack   = require('../../Slack')
const Socket  = require('../../Socket')

const contactWorker       = require('./contacts')
const messageWorker       = require('./messages')
const MicrosoftCredential = require('../credential')



const handleException = async (credential, msg, ex) => {
  Context.log('SyncMicrosoftCalendar handleException', msg, ex)

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    await MicrosoftCredential.disableSync(credential.id)
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Microsoft-Calendar Job postponed`
  const emoji = ':skull:'

  Slack.send({ channel: 'integration_logs', text, emoji })

  return
}

const syncContacts = async (data) => {
  const sync_start_time = new Date()

  let synced_contacts_num    = 0
  let extracted_contacts_num = 0

  const currentCredential = await MicrosoftCredential.get(data.microsoftCredential.id)
  const duplicateCheck    = new Date(currentCredential.last_sync_at).getTime() !== new Date(data.microsoftCredential.last_sync_at).getTime()
  
  if ( duplicateCheck || currentCredential.revoked || currentCredential.deleted_at ) {
    // Slack.send({ channel: 'integration_logs', text: `Microsoft Sync Job Is Skipped - ${data.microsoftCredential.id} - ${data.microsoftCredential.email}`, emoji: ':bell:' })
    return
  }

  const { microsoft } = await getMGraphClient(data.microsoftCredential)

  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: 'Microsoft Sync Job Is skipped, Client Is Failed', emoji: ':skull:' })
    return
  }


  const disableSync = async function(cid) {
    await MicrosoftCredential.disableSync(cid)
  }

  const postponeOutlookSync = async function(cid) {
    await MicrosoftCredential.postponeOutlookSync(cid)
  }

  const handleException = async function(msg, ex) {
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

    const obj = {
      id: data.microsoftCredential.id,
      email: data.microsoftCredential.email,
      last_sync_at: data.microsoftCredential.last_sync_at
    }

    const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Job postponed`
    const emoji = ':bell:'

    Slack.send({ channel: 'integration_logs', text, emoji })

    if (invalidGrant) {
      await disableSync(data.microsoftCredential.id)
    } else {
      await postponeOutlookSync(data.microsoftCredential.id)
    }

    return
  }

  Context.log('SyncMicrosoft - start job', data.microsoftCredential.email, data.microsoftCredential.id)


  // Sync Contact-Folders and Contacts
  if ( data.microsoftCredential.scope_summary.includes('contacts.read') ) {
    const contactFoldersResult = await contactWorker.folders.syncContactFolders(microsoft, data)

    if ( !contactFoldersResult.status && !contactFoldersResult.skip ) {
      await handleException('Job Error - Microsoft Sync Failed [contact-folders]', contactFoldersResult.ex)
      return
    }

    Context.log('SyncMicrosoft - contactFoldersResult', data.microsoftCredential.email)


    const contactsLastRsult = await contactWorker.contacts.syncContacts(microsoft, data)

    if ( !contactsLastRsult.status && !contactsLastRsult.skip ) {
      await handleException('Job Error - Microsoft Sync Failed [contacts]', contactsLastRsult.ex)
      return
    }

    Context.log('SyncMicrosoft - contactsLastRsult', data.microsoftCredential.email)

    synced_contacts_num = contactsLastRsult.createdNum || 0
  }


  // Extract Contacts, Sync Messages
  if ( data.microsoftCredential.scope_summary.includes('mail.read') ) {

    if ( data.microsoftCredential.scope_summary.includes('contacts.read') ) {
      const syncContactsFromSentBoxResult = await messageWorker.extractContacts(microsoft, data)

      if ( !syncContactsFromSentBoxResult.status && !syncContactsFromSentBoxResult.skip ) {
        await handleException('Job Error - Microsoft Sync Failed [extract-contacts]', syncContactsFromSentBoxResult.ex)
        return
      }

      Context.log('SyncMicrosoft - syncContactsFromSentBoxResult', data.microsoftCredential.email)

      extracted_contacts_num = syncContactsFromSentBoxResult.createdNum || 0
    }
  }

  Socket.send('Microsoft.Contacts.Imported', data.microsoftCredential.user, [synced_contacts_num + extracted_contacts_num])


  // Update as Success
  const sync_duration = new Date().getTime() - sync_start_time.getTime()
  await MicrosoftCredential.updateLastSync(data.microsoftCredential.id, sync_duration)

  Context.log('SyncMicrosoft - job Finish', data.microsoftCredential.email, sync_duration)

  return
}



module.exports = {
  syncContacts
}