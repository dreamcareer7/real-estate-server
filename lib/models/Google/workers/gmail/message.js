const config  = require('../../../../config')
const Context = require('../../../Context')
const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { fetchMessages, generateRecord, processLabels } = require('./common')


const syncMessages = async (google, credential, hasLostState = false) => {
  const credentialId = credential.id

  let historyId  = 0
  let createdNum = 0
  let toSyncNum  = config.google_sync.max_sync_emails_num
  let hasSyncedMessages = false

  try {

    const syncedMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    if ( syncedMessagesNum[0]['count'] !== 0 ) {
      hasSyncedMessages = true
    }

    if ( hasLostState || !hasSyncedMessages ) {
      toSyncNum = 250
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

        const record = generateRecord(credentialId, message)

        if(record) {
          googleMessages.push(record)
        }

        if ( googleMessages.length === 50 ) {
          await processLabels(credentialId, googleMessages)
          const createdMessages = await GoogleMessage.create(googleMessages, credentialId)

          createdNum += createdMessages.length
          googleMessages = []

          Context.log('SyncGoogleMessages - syncMessages createdNum', createdNum)
        }
      }

      if ( googleMessages.length > 0 ) {
        await processLabels(credentialId, googleMessages)
        const createdMessages = await GoogleMessage.create(googleMessages, credentialId)

        createdNum += createdMessages.length
        googleMessages = []

        Context.log('SyncGoogleMessages - syncMessages createdNum', createdNum)
      }
    }

    const totalMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    if (hasSyncedMessages) {
      Context.log('SyncGoogleMessages syncMessages update-messages-history-id', credentialId, historyId)
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
