const config  = require('../../../../config')
const Context = require('../../../Context')



const fetchMessages = async function (microsoft, lastSyncAt, projection, fullSync = false) {
  const max = config.microsoft_integration.max_sync_emails_num
  const UTS = new Date().setMonth(new Date().getMonth() - config.microsoft_integration.backward_month_num)

  let messages = []

  const filter_1 = lastSyncAt ? (`&$filter=isDraft eq false and createdDateTime ge ${new Date(lastSyncAt).toISOString()}`) : '&$filter=isDraft eq false'
  const filter_2 = lastSyncAt ? (`&$filter=isDraft eq false and lastModifiedDateTime ge ${new Date(lastSyncAt).toISOString()}`) : '&$filter=isDraft eq false'
  const select   = projection ? (`&$select=${projection}`) : ''
  const expand   = `&$expand=attachments($select=id,name,contentType,size,isInline),extensions($filter=id eq '${config.microsoft_integration.openExtension.outlook.name}')`

  let query = `${filter_1}${select}`

  if (fullSync) {
    query = `${filter_2}${select}${expand}`
  }

  const url = `https://graph.microsoft.com/v1.0/me/messages?$top=250${query}`

  for await (const response of microsoft.discreteGetMessagessNative(url)) {
    if ( !response.value || response.value.length === 0 ) {
      break
    }

    const fetchedMessages = response.value
    messages = messages.concat(fetchedMessages)

    const currentMsgModifiedDateTime = new Date(fetchedMessages[fetchedMessages.length - 1]['lastModifiedDateTime'])
    const currentMsgModifiedDateTS   = Number(currentMsgModifiedDateTime.getTime())

    const currentMsgCreatedDateTime  = new Date(fetchedMessages[fetchedMessages.length - 1]['createdDateTime'])
    const currentMsgCreatedDateTS    = Number(currentMsgCreatedDateTime.getTime())

    const toCheckTS = fullSync ? currentMsgModifiedDateTS : currentMsgCreatedDateTS

    Context.log('SyncOutlookMessages - FetchMessages - Length:', messages.length)

    if( messages.length >= max || toCheckTS <= UTS ) {
      break
    }
  }

  return messages
}

const fetchDeletedMessages = async function (microsoft, lastSyncAt) {
  let messages = []

  const query = `&$select=id,internetMessageId&$filter=lastModifiedDateTime ge ${new Date(lastSyncAt).toISOString()}`
  const url   = `https://graph.microsoft.com/v1.0/me/mailFolders/deleteditems/messages?$top=250${query}`

  for await (const response of microsoft.discreteGetMessagessNative(url)) {
    if ( !response.value || response.value.length === 0 ) {
      break
    }

    messages = messages.concat(response.value)
  }

  return messages
}

const fetchSpamMessages = async function (microsoft, lastSyncAt) {
  let messages = []

  const query = `&$select=id,internetMessageId&$filter=lastModifiedDateTime ge ${new Date(lastSyncAt).toISOString()}`
  const url   = `https://graph.microsoft.com/v1.0/me/mailFolders/junkemail/messages?$top=250${query}`

  try {

    for await (const response of microsoft.discreteGetMessagessNative(url)) {
      if ( !response.value || response.value.length === 0 ) {
        break
      }
  
      messages = messages.concat(response.value)
    }

    return messages

  } catch (ex) {

    if ( ex.statusCode === 404 ) {
      return messages
    }

    throw ex
  }
}

const fetchByMsgIds = async function (microsoft, messageIds, projection) {
  let messages = []

  const expand  = ''
  const select  = projection ? (`?$select=${projection}`) : ''

  do {
    const temp   = messageIds.splice(0,20)
    const result = await microsoft.batchGetMessagesNative(temp, select, expand)
  
    console.log('fetchByMsgIds result', JSON.stringify(result))


    messages = messages.concat(result.responses)

  } while ( messageIds.length > 0 )

  return messages  
}


module.exports = {
  fetchMessages,
  fetchDeletedMessages,
  fetchSpamMessages,
  fetchByMsgIds
}