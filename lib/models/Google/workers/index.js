const GooglePlugin       = require('../plugin/googleapis.js')

const Slack              = require('../../Slack')
const gmailProfileWorker = require('./gmail_profile')
const profileWorker      = require('./profile')
const contactWorker      = require('./contact')
const contactGroupWorker = require('./contact_group')
// const threadWorker    = require('./thread')
// const messageWorker   = require('./message')

const GoogleCredential   = require('../credential')


const setupClient = async (credential) => {
  const google = await GooglePlugin.setupClient(credential)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async tokens => {
    // console.log('\n\n****** sync-job on tokens', tokens)

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

  const liveGoogleCredential = await GoogleCredential.get(data.googleCredential.id)
  if ( new Date(liveGoogleCredential.last_sync_at).getTime() !== new Date(data.googleCredential.last_sync_at).getTime() )
    return


  console.log('\n\n Start gooogle-sync job', data.googleCredential.email, '\n')


  const google = await setupClient(data.googleCredential)

  const user   = data.googleCredential.user
  const brand  = data.googleCredential.brand

  const handleBadCredential = async function(msg, ex) {
    console.log(`${msg} - Info: ${JSON.stringify(data)} - Exception: ${JSON.stringify(ex)}`)
    await GoogleCredential.updateAsRevoked(user, brand)

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


  if ( data.googleCredential.scope.includes('email') && data.googleCredential.scope.includes('profile') ) {

    const profileResult = await profileWorker.syncProfile(google, data)
    if ( !profileResult.status ) {
      await handleBadCredential('Job Error - Google Sync Failed [profile] - Bad Credential', profileResult.ex)
      return
    }
  }

  if ( data.googleCredential.scope.includes('https://www.googleapis.com/auth/contacts.readonly') ) {

    const contactGroupsResult = await contactGroupWorker.syncContactGroups(google, data)
    if ( !contactGroupsResult.status ) {
      await handleBadCredential('Job Error - Google Sync Failed [contact-groups] - Bad Credential', contactGroupsResult.ex)
      return
    }
  
    const contactsLastRsult = await contactWorker.syncContacts(google, data)
    if ( !contactsLastRsult.status ) {
      await handleBadCredential('Job Error - Google Sync Failed [contacts] - Bad Credential', contactsLastRsult.ex)
      return
    }
  }

  if ( data.googleCredential.scope.includes('https://www.googleapis.com/auth/gmail.readonly') ) {

    const gmailProfileResult = await gmailProfileWorker.syncProfile(google, data)
    if ( !gmailProfileResult.status ) {
      await handleBadCredential('Job Error - Google Sync Failed [gmail-profile] - Bad Credential', gmailProfileResult.ex)
      return
    }

    // await threadWorker.syncThreads(google, data)
    // await messageWorker.syncMessages(google, data)
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