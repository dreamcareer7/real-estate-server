const Slack   = require('../../../Slack')
const MicrosoftMessage = require('../../message')

const { getMGraphClient } = require('../../plugin/client.js')



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

  const microsoft  = await getMGraphClient(credential)

  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: 'Microsoft HandleUpdateEvents Is skipped, Client Is failed', emoji: ':skull:' })
    return
  }

  const url       = `https://graph.microsoft.com/v1.0/${offlineMsg.message_id}?$select=id,isDraft,isRead`
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
    
  return await MicrosoftMessage.updateIsRead(offlineMsg.id, remoteMsg.isDraft)
}


module.exports = {
  handleDeleteEvent,
  handleUpdateEvents
}

/*
  Sample Notification {
    data.subscriptionId: '522a3ead-78d8-46db-a052-cd84611da5e0',
    data.subscriptionExpirationDateTime
    data.changeType: 'updated created deleted'
    data.resource: 'users/id/messages/id'
    data.resourceData: {
      '@odata.type': '#Microsoft.Graph.Message',
      '@odata.id': 'Users/be0c5244-9c34-4439-8806-c224613eea09/Messages/AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAETBR40AAA=',
      '@odata.etag': 'W/"CQAAABYAAADC2sKTjOSNTpsi5KIF1ip6AAES7p9m"',
      id: 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAETBR40AAA='
    }
  }
*/