const Context = require('../../../Context')

const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')
const EmailCampaign    = require('../../../Email/campaign')
const Email            = require('../../../Email')

const { fetchHistory, generateGMesssageRecord } = require('./common')


const handleEmailCampaigns = async function (records, credentialId) {
  for (const rec of records) {
    try {

      const currentEmmail   = await Email.get(rec.id)
      const currentCampaing = await EmailCampaign.get(currentEmmail.campaign)
  
      if ( currentCampaing.google_credential !== credentialId )
        continue
  
      await EmailCampaign.saveThreadKey(currentCampaing.id, `${currentCampaing.google_credential}${rec.google_id}`)

    } catch (ex) {

      Context.log('SyncGoogle handleEmailCampaigns Error:', ex)
    }
  }
}

const partialSync = async (google, data) => {
  const credentialId    = data.googleCredential.id
  const googleMessages  = []
  const googleRemoteIds = []

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

        if(record) {
          googleMessages.push(record)
          googleRemoteIds.push(message.message_id)
        }
      }
  
      // messagesDeleted = [message_id, ...]
      await GoogleMessage.deleteByMessageIds(credentialId, messagesDeleted)

      const createdMessages = await GoogleMessage.create(googleMessages)
      createdNum = createdMessages.length

      const rechatEmails = await Email.findByGoogleId(googleRemoteIds)
      await handleEmailCampaigns(rechatEmails, credentialId)

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