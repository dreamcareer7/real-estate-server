const config       = require('../../../config')
const GooglePlugin = require('../plugin/googleapis.js')

const Slack = require('../../Slack')

const peopleProfileWorker = require('./profile/people_profile')
const gmailProfileWorker  = require('./profile/gmail_profile')

const messageWorker      = require('./gmail/message')
const historyWorker      = require('./gmail/history')

// const peopleContactWorker      = require('./people/contact')
// const peopleContactGroupWorker = require('./people/contact_group')

const contactWorker      = require('./contacts/contact')
const contactGroupWorker = require('./contacts/contact_group')

const GoogleCredential   = require('../credential')



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
  const syncStartTime = new Date()

  const currentGoogleCredential = await GoogleCredential.get(data.googleCredential.id)
  const googleJobDuplicateCheck = new Date(currentGoogleCredential.last_sync_at).getTime() !== new Date(data.googleCredential.last_sync_at).getTime()
  if (googleJobDuplicateCheck)
    return

  const google = await setupClient(data.googleCredential)  

  const handleException = async function(msg, ex) {
    console.log('handleException', msg, ex.message, ex)

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
      last_sync_at: data.googleCredential.last_sync_at,
      last_sync_duration: data.googleCredential.last_sync_duration
    }

    Slack.send({ channel: '7-server-errors', text: `${msg} - Info: ${JSON.stringify(obj)} - Exception: ${JSON.stringify(ex)}`, emoji: ':skull:' })
  }

  console.log('\n\n Start gooogle-sync job', data.googleCredential.email, data.googleCredential.id, '\n')


  if ( data.googleCredential.scope.some(entry => config.google_scopes_map.profile.includes(entry)) ) {

    const profileResult = await peopleProfileWorker.syncProfile(google, data)
    if ( !profileResult.status ) {
      await handleException('Job Error - Google Sync Failed [profile]', profileResult.ex)
      return
    }
  }


  if ( data.googleCredential.scope.some(entry => config.google_scopes_map.contacts.includes(entry)) ) {

    const contactGroupsResult = await contactGroupWorker.syncContactGroups(google, data)
    if ( !contactGroupsResult.status ) {
      await handleException('Job Error - Google Sync Failed [contact-groups]', contactGroupsResult.ex)
      return
    }
  
    const contactsLastRsult = await contactWorker.syncContacts(google, data)
    if ( !contactsLastRsult.status ) {
      await handleException('Job Error - Google Sync Failed [contacts]', contactsLastRsult.ex)
      return
    }
  }


  if ( data.googleCredential.scope.some(entry => config.google_scopes_map.gmail.includes(entry)) ) {
    
    // const syncMessagesResult = await messageWorker.syncMessages(google, data)
    // if ( !syncMessagesResult.status ) {
    //   await handleException('Job Error - Google Sync Failed [sync-messages]', syncMessagesResult.ex)
    //   return
    // }

    const gmailProfileResult = await gmailProfileWorker.syncProfile(google, data)
    if ( !gmailProfileResult.status ) {
      await handleException('Job Error - Google Sync Failed [gmail-profile]', gmailProfileResult.ex)
      return
    }
  }


  const syncFinishTime = new Date() 
  const duration       = syncFinishTime.getTime() - syncStartTime.getTime()

  await GoogleCredential.updateLastSyncTime(data.googleCredential.id, syncFinishTime, duration)

  console.log('\nsyncGoogle-job Finish', duration)
  return
}


module.exports = {
  syncGoogle
}