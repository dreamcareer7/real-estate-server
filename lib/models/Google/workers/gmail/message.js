const config  = require('../../../../config')
const mimelib = require('mimelib')

const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')



const fetchMessages = async function (google) {
  const max = config.google_sync.max_sync_emails_num
  const UTS = new Date().setMonth(new Date().getMonth() - config.google_sync.backward_month_num) // setFullYear, getFullYear

  let checkingDate = new Date().getTime()
  let messages     = []
  let rawMessages  = []

  for await (const response of google.discreteSyncMessages()) {
    if(!response.data.messages)
      break
    
    const batchRawResult = await google.batchGetMessages(response.data.messages)
    
    checkingDate = parseInt(batchRawResult[batchRawResult.length - 1]['internalDate'])
    messages     = messages.concat(response.data.messages)
    rawMessages  = rawMessages.concat(batchRawResult)

    if( messages.length >= max || checkingDate <= UTS )
      break
  }

  return rawMessages
}

const syncMessages = async (google, data) => {
  const credentialId = data.googleCredential.id

  const targetHeaders  = ['from', 'to', 'bcc', 'cc']
  const googleMessages = []

  let createdNum = 0

  try {
  
    const messages = await fetchMessages(google)

    const messages_sync_history_id = messages[0].historyId

    if ( messages.length ) {

      for ( const message of messages ) {

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
          message_created_at: Number(new Date(message.internalDate).getTime()),
          data: JSON.stringify(message)
        })
      }
  
      const createdMessages = await GoogleMessage.create(googleMessages)
      createdNum = createdMessages.length
    }

    const totalMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    GoogleCredential.updateMessagesSyncHistoryId(credentialId, messages_sync_history_id)

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
  syncMessages
}