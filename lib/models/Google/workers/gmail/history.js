const mimelib = require('mimelib')

const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')



const fetchMessages = async function (google, messages_sync_history_id) {
  let rawMessagesAdded   = []
  let rawMessagesDeleted = []

  const fields = '&fields=id,threadId,historyId,labelIds,internalDate,internalDate,payload'

  for await (const response of google.discreteHistory(messages_sync_history_id)) {
    if(!response.data.history)
      break

    let messagesAdded   = []
    let messagesDeleted = []

    for ( const history of response.data.history ) {

      if ( history.messagesAdded ) {
        for ( const message of history.messagesAdded )
          messagesAdded = messagesAdded.concat(message.message)
      }

      if ( history.messagesDeleted ) {
        for ( const message of history.messagesDeleted )
          messagesDeleted = messagesDeleted.concat(message.message)
      }
    }

    const batchRawResultAded = await google.batchGetMessages(messagesAdded, fields)
    rawMessagesAdded = rawMessagesAdded.concat(batchRawResultAded)

    const batchRawResultDeleted = await google.batchGetMessages(messagesDeleted, fields)
    rawMessagesDeleted = rawMessagesDeleted.concat(batchRawResultDeleted)
  }

  return {
    rawMessagesAdded,
    rawMessagesDeleted
  }
}


const partialSync = async (google, data) => {
  const credentialId = data.googleCredential.id

  const targetHeaders  = ['from', 'to', 'bcc', 'cc']
  const googleMessages = []

  let createdNum = 0

  try {

    const { rawMessagesAdded } = await fetchMessages(google, data.googleCredential.messages_sync_history_id)
    
    if ( rawMessagesAdded.length ) {
      
      const messages_sync_history_id = rawMessagesAdded[0].historyId

      for ( const message of rawMessagesAdded ) {

        let inBound = true

        if ( message.labelIds.includes('SENT') )
          inBound = false
  
        const recipients = new Set()

        for ( const header of message.payload.headers ) {
          if ( targetHeaders.includes(header.name.toLowerCase()) ) {
            const addresses = mimelib.parseAddresses(header.value)
            addresses.map(a => recipients.add(a.address))

            // if ( header.name.toLowerCase() === 'from' ) {
            //   if ( emails.includes(data.googleCredential.email) )
            //     inBound = true
            // }
          }  
        }

        const recipientsArr = Array.from(recipients)

        googleMessages.push({
          google_credential: credentialId,
          message_id: message.id,
          thread_id: message.threadId,
          history_id: message.historyId,
          recipients: `{${recipientsArr.join(',')}}`,
          in_bound: inBound,
          message_created_at: new Date(Number(message.internalDate)).getTime(),
          data: JSON.stringify(message)
        })
      }
  
      const createdMessages = await GoogleMessage.create(googleMessages)
      createdNum = createdMessages.length

      GoogleCredential.updateMessagesSyncHistoryId(credentialId, messages_sync_history_id)
    }

    const totalMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    return  {
      status: true,
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
  partialSync
}