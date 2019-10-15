const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { fetchHistory, generateGMesssageRecord } = require('./common')

const Context = require('../../../Context')



const partialSync = async (google, data) => {
  const credentialId   = data.googleCredential.id
  const googleMessages = []

  let createdNum = 0

  try {

    const { rawMessagesAdded, messagesDeleted } = await fetchHistory(google, data.googleCredential.messages_sync_history_id)

    if ( rawMessagesAdded.length ) {
      
      const messages_sync_history_id = rawMessagesAdded[0].historyId

      for ( const message of rawMessagesAdded ) {
        /*
          Possible scenario:
          message: {"error":{"errors":[{"domain":"global","reason":"notFound","message":"Not Found"}],"code":404,"message":"Not Found"}}
        */

        try {

          if ( message.error ) {
            if ( message.error.code === 404 )
              continue
          }
  
          if (message.labelIds.includes('DRAFT'))
            continue
  
          googleMessages.push(generateGMesssageRecord(credentialId, message))

        } catch(ex) {
          Context.log('SyncGoogle partialSync Loop-Ex', message, ex)
          throw ex
        }
      }
  
      // messagesDeleted = [message_id, ...]
      await GoogleMessage.deleteByMessageIds(credentialId, messagesDeleted)

      const createdMessages = await GoogleMessage.create(googleMessages)
      createdNum = createdMessages.length

      GoogleCredential.updateMessagesSyncHistoryId(credentialId, messages_sync_history_id)
    }

    const totalMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    return  {
      status: true,
      ex: null,
      createdNum: createdNum,
      deleteNum: messagesDeleted.length,
      totalNum: totalMessagesNum[0]['count']
    }

  } catch (ex) {

    Context.log('SyncGoogle partialSync Ex', ex)

    return  {
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