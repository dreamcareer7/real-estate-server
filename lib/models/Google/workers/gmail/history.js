const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { fetchHistory, generateGMesssageRecord } = require('./common')



const partialSync = async (google, data) => {
  const credentialId   = data.googleCredential.id
  const googleMessages = []

  let createdNum = 0

  try {

    const { rawMessagesAdded, messagesDeleted, needsFullSync } = await fetchHistory(google, data.googleCredential.messages_sync_history_id)

    if (needsFullSync) {
      return {
        needsFullSync: true,
        status: false,
        ex: null,
        createdNum: 0,
        deleteNum: 0,
        totalNum: 0
      }
    }

    if ( rawMessagesAdded.length ) {
      
      const messages_sync_history_id = rawMessagesAdded[0].historyId

      for ( const message of rawMessagesAdded ) {
        /*
          Possible scenario:
          message: {"error":{"errors":[{"domain":"global","reason":"notFound","message":"Not Found"}],"code":404,"message":"Not Found"}}
        */

        if ( message.error ) {
          if ( message.error.code === 404 )
            continue
        }

        if (message.labelIds) {
          if (message.labelIds.includes('DRAFT'))
            continue
        }

        const record = generateGMesssageRecord(credentialId, message)

        if(record)
          googleMessages.push(record)
      }
  
      // messagesDeleted = [message_id, ...]
      await GoogleMessage.deleteByMessageIds(credentialId, messagesDeleted)

      const createdMessages = await GoogleMessage.create(googleMessages)
      createdNum = createdMessages.length

      await GoogleCredential.updateMessagesSyncHistoryId(credentialId, messages_sync_history_id)
    }

    const totalMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    return  {
      needsFullSync: false,
      status: true,
      ex: null,
      createdNum: createdNum,
      deleteNum: messagesDeleted.length,
      totalNum: totalMessagesNum[0]['count']
    }

  } catch (ex) {

    return  {
      needsFullSync: false,
      status: false,
      ex: ex,
      createdNum: 0,
      deleteNum: 0,
      totalNum: 0
    }
  }
}


module.exports = {
  partialSync
}