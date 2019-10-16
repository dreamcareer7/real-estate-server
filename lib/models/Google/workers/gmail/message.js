const Context          = require('../../../Context')
const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { fetchMessages, generateGMesssageRecord } = require('./common')



const syncMessages = async (google, data) => {
  let createdNum = 0

  try {
  
    const messages = await fetchMessages(google)

    const messages_sync_history_id = messages[0].historyId

    if ( messages.length ) {
      let googleMessages = []

      for ( const message of messages ) {
        if (message.labelIds) {
          if (message.labelIds.includes('DRAFT'))
            continue
        }

        const record = generateGMesssageRecord(data.googleCredential.id, message)

        if(record)
          googleMessages.push(record)

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

    const totalMessagesNum = await GoogleMessage.getGCredentialMessagesNum(data.googleCredential.id)

    GoogleCredential.updateMessagesSyncHistoryId(data.googleCredential.id, messages_sync_history_id)

    return  {
      status: true,
      ex: null,
      createdNum: createdNum,
      totalNum: totalMessagesNum[0]['count']
    }

  } catch (ex) {

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