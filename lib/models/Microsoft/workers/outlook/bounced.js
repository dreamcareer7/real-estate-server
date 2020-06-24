const Context = require('../../../Context')

const MicrosoftMessage = require('../../message')
const addEvents = require('./analytics')



const fetchBouncedMessages = async function (microsoft, lastSyncAt) {
  let messages = []

  const select = '$select=id,lastModifiedDateTime,internetMessageId,conversationId,sender,subject,from,internetMessageHeaders'
  const filter = `&$filter=startswith(subject,'Undeliverable') and from/emailAddress/address eq 'postmaster@outlook.com' and lastModifiedDateTime gt ${new Date(lastSyncAt).toISOString()}`
  const url    = `https://graph.microsoft.com/v1.0/me/messages?$top=50${select}${filter}`

  for await (const response of microsoft.discreteGetMessagessNative(url)) {
    if ( !response.value || response.value.length === 0 )
      break

    messages = messages.concat(response.value)
  }


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

  return internetMsgIds
}

const processBouncedMessages = async (microsoft, credential, lastSyncAt) => {
  const internetMsgIds = await fetchBouncedMessages(microsoft, lastSyncAt)

  Context.log('SyncOutlookMessages - processBouncedMessages bounced num', internetMsgIds.length)

  if ( internetMsgIds.length === 0 ) {
    return []
  }

  const messages = await MicrosoftMessage.getByInternetMessageIds(credential.id, internetMsgIds)
  const bouncedMessageIds = messages.map(m => m.message_id)

  await addEvents(bouncedMessageIds, 'failed')

  Context.log('SyncOutlookMessages - processBouncedMessages done')

  return bouncedMessageIds
}

const syncBouncedMessages = async (microsoft, credential, lastSyncAt) => {
  try {

    await processBouncedMessages(microsoft, credential, lastSyncAt)

    return  {
      status: true
    }

  } catch (ex) {

    Context.log(ex)
    Context.log(`SyncOutlookMessages - syncBouncedMessages - catch ex => Email: ${credential.email}, Code: ${ex.statusCode}, Message: ${ex.message}`)

    if ( ex.statusCode === 504 || ex.statusCode === 503 || ex.statusCode === 501 || ex.message === 'Error: read ECONNRESET' ) {
      return  {
        status: false,
        skip: true,
        ex
      }
    }
      
    return  {
      status: false,
      skip: false,
      ex
    }
  }
}


module.exports = {
  processBouncedMessages,
  syncBouncedMessages
}