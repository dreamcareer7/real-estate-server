const config  = require('../../../../config')
const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { fetchMessages, generateRecord, processLabels } = require('./common')
// const { fetchBouncedMessages, setAsDelivered, setAsFailed } = require('./bounced')


const manageMessages = async (credential, messages) => {
  const archivedMsgIds = await processLabels(credential.id, messages)
  
  await GoogleMessage.create(messages, credential.id)
  await GoogleMessage.deleteByMessageIds(credential.id, archivedMsgIds)
}

const syncMessages = async (google, credential, hasLostState = false) => {
  let toSyncNum = config.google_integration.max_sync_emails_num
  let hasSynced = false

  try {

    const messagesResult = await GoogleMessage.getGCredentialMessagesNum(credential.id)

    if ( messagesResult[0]['count'] !== 0 ) {
      hasSynced = true
    }

    if ( hasLostState || !hasSynced ) {
      toSyncNum = 250
    }
  

    const result = await fetchMessages(google, toSyncNum)

    if (result.error) {
      return  {
        status: false,
        ex: result.error
      }      
    }

    if ( result.rawMessages.length === 0 ) {
      return  {
        status: true,
        ex: null
      }
    }


    const historyId = result.rawMessages[0].historyId

    let messages = []

    for ( const message of result.rawMessages ) {
      if ( message.labelIds && ( message.labelIds.includes('SPAM') || message.labelIds.includes('DRAFT') ) ) {
        continue
      }

      const record = generateRecord(credential.id, message)

      if (record) {
        messages.push(record)
      }

      if ( messages.length === 50 ) {
        await manageMessages(credential, messages)
        messages = []
      }
    }

    if ( messages.length > 0 ) {
      await manageMessages(credential, messages)
      messages = []
    }

    if (hasSynced) {
      await GoogleCredential.updateMessagesSyncHistoryId(credential.id, historyId)
    }


    return  {
      status: true,
      ex: null
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}

const watchMailBox = async (google, credential) => {
  const uts = new Date().getTime()
  const exp = Number(credential.watcher_exp) || 0
  const gap = 1 * 24 * 60 * 60 * 1000 // 6 days

  if ( (exp - uts) < gap ) {
    const result = await google.watchMailBox()

    await GoogleCredential.updateMessagesSyncHistoryId(credential.id, result.historyId, result.expiration)

    return result
  }

  return {
    historyId: null,
    expiration: null
  }
}



module.exports = {
  syncMessages,
  watchMailBox
}
