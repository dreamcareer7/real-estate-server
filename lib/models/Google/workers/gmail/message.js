const config  = require('../../../../config')
const Context = require('../../../Context')
const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { fetchMessages, generateGMesssageRecord } = require('./common')



const syncMessages = async (google, data, hasLostState = false) => {
  const credentialId = data.googleCredential.id

  let historyId  = ''
  let createdNum = 0
  let toSyncNum  = config.google_sync.max_sync_emails_num
  let hasSyncedMessages = false

  try {

    const syncedMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    if ( syncedMessagesNum[0]['count'] !== 0 ) {
      hasSyncedMessages = true
    }

    if ( hasLostState || !hasSyncedMessages ) {
      toSyncNum = 500
    }
  
    const result = await fetchMessages(google, toSyncNum)

    if (result.error) {
      return  {
        status: false,
        ex: result.error,
        createdNum,
        totalNum: 0,
        hasSyncedMessages,
        historyId
      }      
    }

    const messages = result.rawMessages

    historyId = messages[0].historyId

    if ( messages.length ) {
      let googleMessages = []

      for ( const message of messages ) {
        if (message.labelIds) {
          if (message.labelIds.includes('DRAFT'))
            continue
        }

        const record = generateGMesssageRecord(credentialId, message)

        if(record) {
          googleMessages.push(record)
        }

        if ( googleMessages.length === 50 ) {
          const createdMessages = await GoogleMessage.create(googleMessages)
          createdNum += createdMessages.length
          Context.log('SyncGoogle syncMessages GoogleMessage.create createdNum:', createdNum)

          googleMessages = []
        }
      }

      if ( googleMessages.length > 0 ) {
        const createdMessages = await GoogleMessage.create(googleMessages)
        createdNum += createdMessages.length
        Context.log('SyncGoogle syncMessages GoogleMessage.create last-loop createdNum:', createdNum)

        googleMessages = []
      }
    }

    const totalMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    if (hasSyncedMessages) {
      Context.log('SyncGoogle syncMessages update-messages-history-id', credentialId, historyId)
      await GoogleCredential.updateMessagesSyncHistoryId(credentialId, historyId)
    }

    return  {
      status: true,
      ex: null,
      createdNum,
      totalNum: totalMessagesNum[0]['count'],
      hasSyncedMessages,
      historyId
    }

  } catch (ex) {

    return  {
      status: false,
      ex,
      createdNum: 0,
      totalNum: 0,
      hasSyncedMessages,
      historyId
    }
  }
}

const watchMailBox = async (google, data) => {
  const uts = new Date().getTime()
  const exp = Number(data.googleCredential.watcher_exp) || 0
  const gap = 6 * 24 * 60 * 60 * 1000 // 6 days

  if ( (exp - uts) < gap ) {
    const result = await google.watchMailBox()

    await GoogleCredential.updateMessagesSyncHistoryId(data.googleCredential.id, result.historyId, result.expiration)

    return result
  }

  return {
    historyId: data.googleCredential.historyId,
    expiration: data.googleCredential.expiration
  }
}



module.exports = {
  syncMessages,
  watchMailBox
}