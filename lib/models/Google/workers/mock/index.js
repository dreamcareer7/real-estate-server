const profileWorker      = require('./profile')
const contactWorker      = require('./contact')
const contactGroupWorker = require('./contact_group')
const threadWorker       = require('./thread')
const messageWorker      = require('./message')

const GoogleCredential   = require('../credential')


const syncGoogle = async (data) => {
  const googleProfile              = await profileWorker.syncProfile(data)
  const contactGroupsLastSyncToken = await contactGroupWorker.syncContactGroups(data)
  const contactsLastSyncToken      = await contactWorker.syncContacts(data)
  await contactWorker.syncContacts(data, true)

  // await threadWorker.syncThreads(data)
  // await messageWorker.syncMessages(data)

  const syncFinishTime = new Date() 
  await GoogleCredential.updateLastSyncTime(data.googleCredential.id, syncFinishTime)

  return {
    syncFinishTime: syncFinishTime,
    googleProfile,
    contactGroupsLastSyncToken,
    contactsLastSyncToken
  }
}


module.exports = {
  syncGoogle
}