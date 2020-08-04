const Context = require('../../../Context')

const MicrosoftMessage = require('../../message')
const Email = require('../../../Email/events')


const handleBouncedMessages = (messages) => {
  const internetMsgIds = []

  for ( const message of messages ) {
    if ( message.internetMessageHeaders ) {
      for ( const header of message.internetMessageHeaders ) {
        if ( header.name.toLowerCase() === 'in-reply-to' ) {
          internetMsgIds.push(header.value.substring(1, header.value.length - 1))
        }
      }
    }
  }

  Context.log('SyncOutlookMessages - fetchBouncedMessages - Length', internetMsgIds.length)

  return internetMsgIds
}

const fetchBouncedMessages = async function (microsoft, lastSyncAt) {
  let messages = []

  const select = '&$select=id,lastModifiedDateTime,internetMessageId,conversationId,sender,subject,from,internetMessageHeaders'
  const filter = `&$filter=startswith(subject,'Undeliverable') and from/emailAddress/address eq 'postmaster@outlook.com' and lastModifiedDateTime gt ${new Date(lastSyncAt).toISOString()}`
  const url    = `https://graph.microsoft.com/v1.0/me/messages?$top=50${select}${filter}`

  for await (const response of microsoft.discreteGetMessagessNative(url)) {
    if ( !response.value || response.value.length === 0 )
      break

    messages = messages.concat(response.value)
  }

  return handleBouncedMessages(messages)
}

const setAsDelivered = async (messageIds) => {
  await Email.addEvents(messageIds, 'delivered', 'outlook')

  Context.log('SyncOutlookMessages - setAsDelivered Done')
}

const setAsFailed = async (credential, internetMsgIds) => {
  const messages = await MicrosoftMessage.getByInternetMessageIds(credential.id, internetMsgIds)
  const bouncedMessageIds = messages.map(m => m.message_id)

  await Email.addEvents(bouncedMessageIds, 'failed', 'outlook')

  Context.log('SyncOutlookMessages - setAsFailed Done')
}


module.exports = {
  fetchBouncedMessages,
  setAsDelivered,
  setAsFailed
}
