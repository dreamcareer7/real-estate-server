const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { fetchMessages, generateGMesssageRecord } = require('./common')

const Context = require('../../../Context')



const syncMessages = async (google, data) => {
  const credentialId   = data.googleCredential.id
  const googleMessages = []

  let createdNum = 0

  try {
  
    const messages = await fetchMessages(google)

    Context.log('SyncGoogle syncMessages messages.length', messages.length)

    const messages_sync_history_id = messages[0].historyId

    if ( messages.length ) {

      for ( const message of messages ) {
        try {

          if (message.labelIds.includes('DRAFT'))
            continue
  
          googleMessages.push(generateGMesssageRecord(credentialId, message))

        } catch(ex) {
          Context.log('SyncGoogle syncMessages Loop-Ex', message, ex)
        }
      }
  
      const createdMessages = await GoogleMessage.create(googleMessages)
      createdNum = createdMessages.length
    }

    const totalMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    GoogleCredential.updateMessagesSyncHistoryId(credentialId, messages_sync_history_id)

    return  {
      status: true,
      ex: null,
      createdNum: createdNum,
      totalNum: totalMessagesNum[0]['count']
    }

  } catch (ex) {

    Context.log('SyncGoogle syncMessages Ex.message', ex.message)

    return  {
      status: false,
      ex: ex,
      createdNum: 0,
      totalNum: 0
    }
  }
}


module.exports = {
  syncMessages
}