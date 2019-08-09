const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { parser, fetchMessages } = require('./common')



const syncMessages = async (google, data) => {
  const credentialId   = data.googleCredential.id
  const googleMessages = []

  let createdNum = 0

  try {
  
    const messages = await fetchMessages(google)

    const messages_sync_history_id = messages[0].historyId

    if ( messages.length ) {

      for ( const message of messages ) {

        const { recipientsArr, attachments, internetMessageId, subject, from, to, cc, bcc } = parser(message)

        googleMessages.push({
          google_credential: credentialId,
          message_id: message.id,
          thread_id: message.threadId,
          history_id: message.historyId,
          internet_message_id: internetMessageId,
          in_bound: (message.labelIds.includes('SENT')) ? false : true,
          recipients: `{${recipientsArr.join(',')}}`,

          subject: subject,
          has_attachments: (attachments.length > 0) ? true : false,
          attachments: JSON.stringify(attachments),

          '"from"': JSON.stringify(from),
          '"to"': JSON.stringify(to),
          cc: JSON.stringify(cc),
          bcc: JSON.stringify(bcc),

          message_created_at: new Date(Number(message.internalDate)).getTime(),
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