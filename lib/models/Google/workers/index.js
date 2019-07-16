const config       = require('../../../config')
const GooglePlugin = require('../plugin/googleapis.js')

const Slack  = require('../../Slack')
const Socket = require('../../Socket')

const peopleProfileWorker = require('./profile/people_profile')
// const gmailProfileWorker  = require('./profile/gmail_profile')

// const messageWorker = require('./gmail/message')
// const historyWorker = require('./gmail/history')

const contactWorker      = require('./contacts/contact')
const contactGroupWorker = require('./contacts/contact_group')

const GoogleCredential   = require('../credential')
const GoogleSyncHistory  = require('../sync_history')



const setupClient = async (credential) => {
  const google = await GooglePlugin.setupClient(credential)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async tokens => {
    if (tokens.refresh_token) {
      await GoogleCredential.updateRefreshToken(credential.id, tokens.refresh_token)
      await google.setCredentials({ refresh_token: tokens.refresh_token })
    }

    await GoogleCredential.updateAccesshToken(credential.id, tokens.access_token)
    await google.setCredentials({ access_token: tokens.access_token })
  })

  return google
}

const syncGoogle = async (data) => {
  const sync_start_time = new Date()

  const synced_messages_num = 0
  const messages_total      = 0
  const synced_threads_num  = 0
  const threads_total       = 0

  let synced_contacts_num = 0
  let contacts_total      = 0
  let sync_duration       = 0

  const currentGoogleCredential = await GoogleCredential.get(data.googleCredential.id)
  const googleJobDuplicateCheck = new Date(currentGoogleCredential.last_sync_at).getTime() !== new Date(data.googleCredential.last_sync_at).getTime()
  if (googleJobDuplicateCheck) {
    await GoogleCredential.updateSyncStatus(currentGoogleCredential.id, 'success')
    return
  }

  const google = await setupClient(data.googleCredential)

  const addLastSyncRecord = async function(status) {
    return await GoogleSyncHistory.addSyncHistory({
      user: data.googleCredential.user,
      brand: data.googleCredential.brand,
      google_credential: data.googleCredential.id,
  
      synced_messages_num: synced_messages_num,
      messages_total: messages_total,
      synced_threads_num: synced_threads_num,
      threads_total: threads_total,
      synced_contacts_num: synced_contacts_num,
      contacts_total: contacts_total,
      sync_duration: sync_duration,
  
      status: status
    })
  }

  const handleException = async function(msg, ex) {
    console.log('------ handleException', msg, ex.message, ex)

    if ( ex.message === 'invalid_grant' )
      await GoogleCredential.updateAsRevoked(data.googleCredential.id)

    const obj = {
      id: data.googleCredential.id,
      user: data.googleCredential.user,
      brand: data.googleCredential.brand,
      resource_name: data.googleCredential.resource_name,
      email: data.googleCredential.email,
      scope: data.googleCredential.scope,
      revoked: data.googleCredential.revoked,
      last_sync_at: data.googleCredential.last_sync_at
    }

    Slack.send({ channel: '7-server-errors', text: `${msg} - Info: ${JSON.stringify(obj)} - Exception: ${JSON.stringify(ex)}`, emoji: ':skull:' })


    const sync_finish_time = new Date() 
    sync_duration = sync_finish_time.getTime() - sync_start_time.getTime()

    await addLastSyncRecord(false)
  }

  console.log('\n\n Start gooogle-sync job', data.googleCredential.email, data.googleCredential.id, '\n')


  if ( data.googleCredential.scope.some(entry => config.google_scopes_map.profile.includes(entry)) ) {

    const profileResult = await peopleProfileWorker.syncProfile(google, data)
    console.log('profileResult', data.googleCredential.id, profileResult)
    if ( !profileResult.status ) {
      await handleException('Job Error - Google Sync Failed [profile]', profileResult.ex)
      return
    }
  }


  if ( data.googleCredential.scope.some(entry => config.google_scopes_map.contacts.includes(entry)) ) {

    const contactGroupsResult = await contactGroupWorker.syncContactGroups(google, data)
    console.log('contactGroupsResult', data.googleCredential.id, contactGroupsResult)
    if ( !contactGroupsResult.status ) {
      await handleException('Job Error - Google Sync Failed [contact-groups]', contactGroupsResult.ex)
      return
    }
  
    const contactsLastRsult = await contactWorker.syncContacts(google, data)
    console.log('contactsLastRsult', data.googleCredential.id, contactsLastRsult)
    if ( !contactsLastRsult.status ) {
      await handleException('Job Error - Google Sync Failed [contacts]', contactsLastRsult.ex)
      return
    }

    synced_contacts_num = contactsLastRsult.createdNum
    contacts_total      = contactsLastRsult.totalNum
  }


  // if ( data.googleCredential.scope.some(entry => config.google_scopes_map.gmail.includes(entry)) ) {
    
  //   const gmailProfileResult = await gmailProfileWorker.syncProfile(google, data)
  //   if ( !gmailProfileResult.status ) {
  //     await handleException('Job Error - Google Sync Failed [gmail-profile]', gmailProfileResult.ex)
  //     return
  //   }

  //   const syncMessagesResult = await messageWorker.syncMessages(google, data)
  //   if ( !syncMessagesResult.status ) {
  //     await handleException('Job Error - Google Sync Failed [sync-messages]', syncMessagesResult.ex)
  //     return
  //   }

  //   synced_messages_num = syncMessagesResult.createdNum
  //   messages_total      = syncMessagesResult.totalNum
  // }


  const sync_finish_time = new Date() 
  sync_duration = sync_finish_time.getTime() - sync_start_time.getTime()

  console.log('--- here 1', data.googleCredential.id)
  await GoogleCredential.updateLastSync(data.googleCredential.id, sync_finish_time, sync_duration)
  console.log('--- here 2', data.googleCredential.id)
  await addLastSyncRecord(true)
  console.log('--- here 3', data.googleCredential.id)

  Socket.send('Google.Contacts.Imported', data.googleCredential.user, [synced_contacts_num])
  console.log('\nsyncGoogle-job Finish', sync_duration)

  return
}


module.exports = {
  syncGoogle
}