const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { parser, fetchHistory } = require('./common')



const partialSync = async (google, data) => {
  const credentialId   = data.googleCredential.id
  const googleMessages = []

  let createdNum = 0

  try {

    const { rawMessagesAdded } = await fetchHistory(google, data.googleCredential.messages_sync_history_id)
    
    if ( rawMessagesAdded.length ) {
      
      const messages_sync_history_id = rawMessagesAdded[0].historyId

      for ( const message of rawMessagesAdded ) {

        const { recipientsArr, attachments, internetMessageId, inReplyTo, subject, from, to, cc, bcc } = parser(message)

        googleMessages.push({
          google_credential: credentialId,
          message_id: message.id,
          thread_id: message.threadId,
          history_id: message.historyId,
          in_reply_to: inReplyTo,
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
          message_date: new Date(Number(message.internalDate)).toISOString(),

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
  partialSync
}