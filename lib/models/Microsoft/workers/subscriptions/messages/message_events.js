const MicrosoftMessage = require('../../../message')
const getClient = require('../../../client')



const getOfflineMessage = async (cid, mid) => {
  try {
    return await MicrosoftMessage.getByMessageId(mid, cid)
  } catch (ex) {
    // not found
    return null
  }
}

const checkLocalMessage = async (credentialId, resourceId) => {
  const offlineMsg = await getOfflineMessage(credentialId, resourceId)

  if (!offlineMsg) {
    return null
  }

  if (offlineMsg.deleted_at) {
    return null
  }

  return offlineMsg
}

const handleDeleteEvent = async (credential, resourceId) => {
  const offlineMsg = await checkLocalMessage(credential.id, resourceId)

  if (!offlineMsg) {
    return
  }
  
  return await MicrosoftMessage.deleteByRemoteMessageIds(credential.id, [resourceId])
}

const handleUpdateEvents = async (credential, resourceId) => {
  const offlineMsg = await checkLocalMessage(credential.id, resourceId)

  if (!offlineMsg) {
    return
  }

  const microsoft = await getClient(credential.id, 'outlook')

  const url       = `https://graph.microsoft.com/v1.0/me/messages/${offlineMsg.message_id}?$select=id,isDraft,isRead`
  const remoteMsg = await microsoft.geMessagesByUrl(url)

  if (!remoteMsg) {
    return
  }

  if (remoteMsg.isDraft) {
    return
  }

  if ( offlineMsg.is_read === remoteMsg.isRead ) {
    return
  }
    
  return await MicrosoftMessage.updateIsRead([offlineMsg.id], remoteMsg.isRead, credential.id)
}

const handleCreateEvents = async (credential, resourceId) => {
  const microsoft = await getClient(credential.id, 'outlook')

  const url       = `https://graph.microsoft.com/v1.0/me/messages/${resourceId}?$select=id,isDraft,isRead`
  const remoteMsg = await microsoft.geMessagesByUrl(url)

  if (!remoteMsg) {
    return false
  }

  if (remoteMsg.isDraft) {
    return false
  }

  return true
}


module.exports = {
  handleDeleteEvent,
  handleUpdateEvents,
  handleCreateEvents
}