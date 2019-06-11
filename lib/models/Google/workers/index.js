const Slack              = require('../../../models/Slack')
const gmailProfileWorker = require('./gmail_profile')
const profileWorker      = require('./profile')
const contactWorker      = require('./contact')
const contactGroupWorker = require('./contact_group')
// const threadWorker    = require('./thread')
// const messageWorker   = require('./message')

const GoogleCredential   = require('../credential')


const syncGoogle = async (data) => {
  const syncStartTime = new Date()

  console.log('\n\n Start gooogle-sync job', data.googleCredential, '\n')

  const user  = data.googleCredential.user
  const brand = data.googleCredential.brand

  const handleBadCredential = async function(msg, ex) {
    console.log(`${msg} - Info: ${JSON.stringify(data)} - Exception: ${JSON.stringify(ex)}`)
    await GoogleCredential.updateAsRevoked(user, brand)
    Slack.send({ channel: '7-server-errors', text: `${msg} - Info: ${JSON.stringify(data)} - Exception: ${JSON.stringify(ex)}`, emoji: ':skull:' })
  }


  if ( data.googleCredential.scope.includes('https://www.googleapis.com/auth/gmail.readonly') ) {

    const gmailProfileResult = await gmailProfileWorker.syncProfile(data)
    if ( !gmailProfileResult.status ) {
      await handleBadCredential('Job Error - Google Sync Failed [gmail-profile] - Bad Credential', gmailProfileResult.ex)
      return
    }

    // await threadWorker.syncThreads(data)
    // await messageWorker.syncMessages(data)
  }

  if ( data.googleCredential.scope.includes('email') && data.googleCredential.scope.includes('profile') ) {

    const profileResult = await profileWorker.syncProfile(data)
    if ( !profileResult.status ) {
      await handleBadCredential('Job Error - Google Sync Failed [profile] - Bad Credential', profileResult.ex)
      return
    }
  }

  if ( data.googleCredential.scope.includes('https://www.googleapis.com/auth/contacts.readonly') ) {

    const contactGroupsResult = await contactGroupWorker.syncContactGroups(data)
    if ( !contactGroupsResult.status ) {
      await handleBadCredential('Job Error - Google Sync Failed [contact-groups] - Bad Credential', contactGroupsResult.ex)
      return
    }
  
    const contactsLastRsult = await contactWorker.syncContacts(data)
    if ( !contactsLastRsult.status ) {
      await handleBadCredential('Job Error - Google Sync Failed [contacts] - Bad Credential', contactsLastRsult.ex)
      return
    }
  }


  const syncFinishTime = new Date() 
  const duration       = syncFinishTime.getTime() - syncStartTime.getTime()
  await GoogleCredential.updateLastSyncTime(data.googleCredential.id, syncFinishTime, duration)

  console.log('\nsyncGoogle-job Finish', duration)

  return true
}


module.exports = {
  syncGoogle
}