const config  = require('../../../../config')

const Context          = require('../../../Context')
const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')
const Email            = require('../../../Email/index.js')

const { fetchMessages, generateGMesssageRecord, handleEmailCampaigns } = require('./common')


const syncMessages = async (google, data, hasLostState = false) => {
  let createdNum = 0
  let toSyncNum  = config.google_sync.max_sync_emails_num
  let hasSyncedMessages = false

  const credentialId = data.googleCredential.id

  try {

    const syncedMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    if ( syncedMessagesNum[0]['count'] !== 0 )
      hasSyncedMessages = true

    if ( hasLostState || !hasSyncedMessages )
      toSyncNum = 1000
  
    const messages = await fetchMessages(google, toSyncNum)

    const messages_sync_history_id = messages[0].historyId

    if ( messages.length ) {
      let googleMessages       = []
      let googleRemoteIds      = []
      let rechatEmailsToUpdate = []

      for ( const message of messages ) {
        if (message.labelIds) {
          if (message.labelIds.includes('DRAFT'))
            continue
        }

        const record = generateGMesssageRecord(credentialId, message)

        if(record) {
          googleMessages.push(record)
          googleRemoteIds.push(message.message_id)
        }

        if ( googleMessages.length === 50 ) {
          const createdMessages = await GoogleMessage.create(googleMessages)
          createdNum += createdMessages.length
          Context.log('SyncGoogle syncMessages GoogleMessage.create createdNum:', createdNum)

          const rechatEmails = await Email.findByGoogleId(googleRemoteIds)
          rechatEmailsToUpdate = rechatEmailsToUpdate.concat(rechatEmails)

          googleRemoteIds = []
          googleMessages  = []
        }
      }

      if ( googleMessages.length > 0 ) {
        const createdMessages = await GoogleMessage.create(googleMessages)
        createdNum += createdMessages.length
        Context.log('SyncGoogle syncMessages GoogleMessage.create last-loop createdNum:', createdNum)

        const rechatEmails = await Email.findByGoogleId(googleRemoteIds)
        rechatEmailsToUpdate = rechatEmailsToUpdate.concat(rechatEmails)

        googleRemoteIds = []
        googleMessages  = []
      }

      await handleEmailCampaigns(rechatEmailsToUpdate, credentialId)
    }

    const totalMessagesNum = await GoogleMessage.getGCredentialMessagesNum(credentialId)

    if (hasSyncedMessages)
      await GoogleCredential.updateMessagesSyncHistoryId(credentialId, messages_sync_history_id)

    return  {
      status: true,
      ex: null,
      createdNum: createdNum,
      totalNum: totalMessagesNum[0]['count'],
      hasSyncedMessages
    }

  } catch (ex) {

    return  {
      status: false,
      ex: ex,
      createdNum: 0,
      totalNum: 0,
      hasSyncedMessages
    }
  }
}


module.exports = {
  syncMessages
}