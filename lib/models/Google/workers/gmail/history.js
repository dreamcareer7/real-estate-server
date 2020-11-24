const GoogleMessage    = require('../../message')
const GoogleCredential = require('../../credential')

const { fetchHistory } = require('./fetch')
const { generateRecord, processLabels } = require('./common')



const partialSync = async (google, credential) => {
  const messages = []
  const spam     = []

  let toBeDeleted = []

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

      const archivedMsgIds = await processLabels(credential.id, messages)
      toBeDeleted = toBeDeleted.concat(deletedIds).concat(archivedMsgIds).concat(spam)

      await GoogleCredential.updateMessagesSyncHistoryId(credential.id, historyId)
      await GoogleMessage.create(messages, credential.id)
    }

    await GoogleMessage.deleteByMessageIds(credential.id, toBeDeleted)

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
