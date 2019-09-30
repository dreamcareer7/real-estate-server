const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { fetchHistory, generateGMesssageRecord } = require('./common')



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

        if ( message.error ) {
          if ( message.error.code === 404 )
            continue
        }

        googleMessages.push(generateGMesssageRecord(credentialId, message))

        /* 
          Old style

          const { parser, fetchHistory } = require('./common')

          const {
            recipientsArr, attachments, internetMessageId, inReplyTo, subject,
            from_raw, to_raw, cc_raw, bcc_raw,
            from, to, cc, bcc
          } = parser(message)
   
          googleMessages.push({
            google_credential: credentialId,
            message_id: message.id,
            thread_id: message.threadId,
            thread_key: `${credentialId}${message.threadId}`,
            history_id: message.historyId,
            internet_message_id: internetMessageId,
            in_reply_to: inReplyTo,
            in_bound: (message.labelIds.includes('SENT')) ? false : true,
            recipients: `{${recipientsArr.join(',')}}`,
   
            subject: subject,
            has_attachments: (attachments.length > 0) ? true : false,
            attachments: JSON.stringify(attachments),
   
            from_raw: JSON.stringify(from_raw),
            to_raw: JSON.stringify(to_raw),
            cc_raw: JSON.stringify(cc_raw),
            bcc_raw: JSON.stringify(bcc_raw),
   
            '"from"': from,
            '"to"': to,
            cc: cc,
            bcc: bcc,
   
            message_created_at: new Date(Number(message.internalDate)).getTime(),
            message_date: new Date(Number(message.internalDate)).toISOString()
   
            // data: JSON.stringify(message)
          })
        */
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