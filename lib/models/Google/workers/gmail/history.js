const Context = require('../../../Context')
const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { fetchHistory, generateRecord, processLabels } = require('./common')



const partialSync = async (google, credential) => {
  const messages = []
  const spam     = []

  try {

    const { rawMessages, deletedIds, needsFullSync } = await fetchHistory(google, credential.messages_sync_history_id)

    if (needsFullSync) {
      return {
        needsFullSync: true,
        status: false,
        ex: null
      }
    }

    if ( rawMessages.length ) {
      
      const historyId = rawMessages[0].historyId

      for ( const message of rawMessages ) {
        if ( message.error ) {
          /*
            Possible scenario:
            message: {"error":{"errors":[{"domain":"global","reason":"notFound","message":"Not Found"}],"code":404,"message":"Not Found"}}
          */

          if ( message.error.code === 404 ) {
            continue
          }
        }

        // We need to exclude spam messages, Some of them may be old, so we must delete them insted of ignoring.
        if ( message.labelIds && ( message.labelIds.includes('SPAM') || message.labelIds.includes('DRAFT') ) ) {
          spam.push(message.id)

        } else {

          const record = generateRecord(credential.id, message)
  
          if (record) {
            messages.push(record)
          }
        }        
      }

      await processLabels(credential.id, messages)
      await GoogleMessage.create(messages, credential.id)
      await GoogleMessage.deleteByMessageIds(credential.id, spam)
      await GoogleCredential.updateMessagesSyncHistoryId(credential.id, historyId)

      Context.log('SyncGoogleMessages partialSync update-messages-history-id', credential.id, historyId)
    }

    if ( deletedIds.length ) {
      await GoogleMessage.deleteByMessageIds(credential.id, deletedIds)
    }

    return  {
      needsFullSync: false,
      status: true,
      ex: null
    }

  } catch (ex) {

    return  {
      needsFullSync: false,
      status: false,
      ex
    }
  }
}


module.exports = {
  partialSync
}
