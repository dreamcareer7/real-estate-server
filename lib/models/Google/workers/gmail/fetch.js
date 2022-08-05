const config = require('../../../../config')

const { getFields } = require('./fields')

const rateLimitCodes = [429, 430]
const rateLimitError = {
  message: 'rateLimitExceeded',
  status: 429, 
  statusCode: 429
}



const fetchMessages = async function (google, max) {
  const UTS    = new Date().setMonth(new Date().getMonth() - config.google_integration.backward_month_num)
  const fields = getFields()

  let rateLimitExceeded = false
  let checkingDate = new Date().getTime()
  let rawMessages  = []

  for await (const response of google.discreteSyncMessages(50)) {
    if(!response.data.messages) {
      break
    }

    const ids = response.data.messages.map(message => message.id)
    const batchRawResult = await google.batchGetMessages(ids, fields)

    if (batchRawResult.error) {
      if (rateLimitCodes.includes(batchRawResult.error.code)) {
        rateLimitExceeded = true
        break
      }
    }
    
    checkingDate = parseInt(batchRawResult[batchRawResult.length - 1]['internalDate'])
    rawMessages  = rawMessages.concat(batchRawResult)

    if( rawMessages.length >= max || checkingDate <= UTS ) {
      break
    }
  }

  if (rateLimitExceeded) {
    return {
      rawMessages: null,
      error: rateLimitError
    }
  }

  return {
    rawMessages,
    error: null
  }
}

const fetchHistory = async function (google, messages_sync_history_id) {
  const fields     = getFields()
  const deletedIds = new Set()
  const messageIds = new Set()

  let rawMessages = []

  for await (const response of google.discreteHistory(50, messages_sync_history_id)) {

    if (response.data.error) {
      if (response.data.error.code === 404 ) {
        return {
          needsFullSync: true,
          rawMessages,
          deletedIds: []
        }
      }
    }

    if(!response.data.history) {
      break
    }

    const temp = new Set()

    for ( const history of response.data.history ) {

      if ( history.messagesAdded ) {
        for ( const msg of history.messagesAdded ) {
          if (!messageIds.has(msg.message.id)) {
            temp.add(msg.message.id)
          }
          messageIds.add(msg.message.id)
        }
      }

      if ( history.labelsAdded ) {
        for ( const msg of history.labelsAdded ) {
          if (!messageIds.has(msg.message.id)) {
            temp.add(msg.message.id)
          }
          messageIds.add(msg.message.id)
        }
      }

      if ( history.labelsRemoved ) {
        for ( const msg of history.labelsRemoved ) {
          if (!messageIds.has(msg.message.id)) {
            temp.add(msg.message.id)
          }
          messageIds.add(msg.message.id)
        }
      }

      if ( history.messagesDeleted ) {
        for ( const msg of history.messagesDeleted ) {
          deletedIds.add(msg.message.id)

          if (messageIds.has(msg.message.id)) {
            messageIds.delete(msg.message.id)
            temp.delete(msg.message.id)
          }
        }
      }
    }

    if ( temp.size ) {
      const batchRawResultAded = await google.batchGetMessages(Array.from(temp), fields)
      rawMessages = rawMessages.concat(batchRawResultAded)
    }
  }

  return {
    needsFullSync: false,
    rawMessages,
    messageIds,
    deletedIds: Array.from(deletedIds)
  }
}

const fetchByMsgIds = async function (google, messageIds) {
  const fields = getFields()

  let rateLimitExceeded = false
  let rawMessages = []

  do {
    const ids = messageIds.splice(0, 25)

    const batchRawResult = await google.batchGetMessages(ids, fields)

    if (batchRawResult.error) {
      if (rateLimitCodes.includes(batchRawResult.error.code)) {
        rateLimitExceeded = true
        break
      }
    }
    
    rawMessages = rawMessages.concat(batchRawResult)

  } while ( messageIds.length > 0 )


  if (rateLimitExceeded) {
    return {
      rawMessages: null,
      error: rateLimitError
    }
  }

  return {
    rawMessages,
    error: null
  }
}


module.exports = {
  fetchMessages,
  fetchHistory,
  fetchByMsgIds
}


/*
  Google.batchGetMessages

  When you are using Google batch APIs, if any batch request fails, request object will not throw an exception!
  So you need to check the batch respons and look for any potential error. 

    batchRawResult could be:
    {
      "error": {
        "errors": [{
          "domain": "usageLimits",
          "reason": "rateLimitExceeded",
          "message": "Too many concurrent requests for user"
        }],
        "code": 429,
        "message": "Too many concurrent requests for user"
      }
    }
*/