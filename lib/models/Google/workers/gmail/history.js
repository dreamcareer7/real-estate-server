const Context = require('../../../Context')
const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { fetchHistory, generateGMesssageRecord } = require('./common')



const partialSync = async (google, data) => {
  const credentialId   = data.googleCredential.id
  const googleMessages = []

  let createdNum = 0
  let historyId  = ''

  try {

    const { rawMessages, deletedIds, needsFullSync } = await fetchHistory(google, data.googleCredential.messages_sync_history_id)

    if (needsFullSync) {
      return {
        needsFullSync: true,
        status: false,
        ex: null,
        createdNum,
        deleteNum: 0,
        totalNum: 0,
        historyId
      }
    }

    if ( rawMessages.length ) {
      
      historyId = rawMessages[0].historyId

      for ( const message of rawMessages ) {
        
        if ( message.error ) {
          /*
            Possible scenario:
            message: {"error":{"errors":[{"domain":"global","reason":"notFound","message":"Not Found"}],"code":404,"message":"Not Found"}}
          */

          if ( message.error.code === 404 )
            continue
        }

        const record = generateGMesssageRecord(credentialId, message)

        if(record)
          googleMessages.push(record)
      }

      const createdMessages = await GoogleMessage.create(googleMessages)
      createdNum = createdMessages.length

      Context.log('SyncGoogle partialSync update-messages-history-id', credentialId, historyId)
      await GoogleCredential.updateMessagesSyncHistoryId(credentialId, historyId)
    }

    if ( deletedIds.length ) {
      await GoogleMessage.deleteByMessageIds(credentialId, deletedIds)
    }

    const totalMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    return  {
      needsFullSync: false,
      status: true,
      ex: null,
      createdNum,
      deleteNum: deletedIds.length,
      totalNum: totalMessagesNum[0]['count'],
      historyId
    }

  } catch (ex) {

    return  {
      needsFullSync: false,
      status: false,
      ex,
      createdNum: 0,
      deleteNum: 0,
      totalNum: 0,
      historyId
    }
  }
}


module.exports = {
  partialSync
}