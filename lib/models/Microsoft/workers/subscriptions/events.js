const Context = require('../../../Context')
const Slack   = require('../../../Slack')
const MicrosoftMessage = require('../../message')

const { getMGraphClient } = require('../../plugin/client.js')


const getMicrosoftClient = async (credential) => {
  const microsoft = await getMGraphClient(credential)

  if (!microsoft) {
    throw new Error('Microsoft HandleUpdateEvents Is skipped, Client Is failed')
  }

  return microsoft
}

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
    Context.log('***** OutlookSub in handleDeleteEvent - offlineMsg not found')
    return
  }
  
  Context.log('***** OutlookSub in handleDeleteEvent - deleteByRemoteMessageIds', resourceId)
  return await MicrosoftMessage.deleteByRemoteMessageIds(credential.id, [resourceId])
}

const handleUpdateEvents = async (credential, resourceId) => {
  const offlineMsg = await checkLocalMessage(credential.id, resourceId)

  if (!offlineMsg) {
    Context.log('***** OutlookSub in handleUpdateEvents - offlineMsg not found')
    return
  }

  const microsoft = await getMicrosoftClient(credential)

  const url       = `https://graph.microsoft.com/v1.0/me/messages/${offlineMsg.message_id}?$select=id,isDraft,isRead`
  const remoteMsg = await microsoft.geMessagesByUrl(url)

  if (!remoteMsg) {
    Context.log('***** OutlookSub in handleUpdateEvents - remoteMsg not found')
    return
  }

  if (remoteMsg.isDraft) {
    Context.log('***** OutlookSub in handleUpdateEvents - remoteMsg is draft')
    return
  }

  if ( offlineMsg.is_read === remoteMsg.isRead ) {
    Context.log('***** OutlookSub in handleUpdateEvents - remoteMsg has not changed')
    return
  }
    
  Context.log('***** OutlookSub in handleUpdateEvents - updateIsRead', remoteMsg.isRead, offlineMsg.id)
  return await MicrosoftMessage.updateIsRead(offlineMsg.id, remoteMsg.isRead)
}


const handleCreateEvents = async (credential, resourceId) => {
  const microsoft = await getMicrosoftClient(credential)

  const url       = `https://graph.microsoft.com/v1.0/me/messages/${resourceId}?$select=id,isDraft,isRead`
  const remoteMsg = await microsoft.geMessagesByUrl(url)

  if (!remoteMsg) {
    Context.log('***** OutlookSub in handleCreateEvents - remoteMsg not found')
    return false
  }

  if (remoteMsg.isDraft) {
    Context.log('***** OutlookSub in handleCreateEvents - remoteMsg is draft')
    return false
  }

  return true
}


module.exports = {
  handleDeleteEvent,
  handleUpdateEvents,
  handleCreateEvents
}