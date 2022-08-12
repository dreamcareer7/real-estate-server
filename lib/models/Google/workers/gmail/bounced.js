/*
  This part of code is not yet being used!
  So it could be buggy!
  Be carefull to run or user the below logic !!!
*/

const { keyBy } = require('lodash')
const mimelib   = require('mimelib')

const GoogleMessage = require('../../message')
const Email = require('../../../Email/events')

const { getFields } = require('./fields')


const handleBouncedMessages = (messages) => {
  /*
    message.payload.headers

    original
    {
      "name": "Message-ID",
      "value": "<CAMQCtF_9D0PPupza7Hspzg90LDFEhkSiGdtusZ5SWHGjedQe_Q@mail.gmail.com>"
    }

    report
    {
      "name": "From",
      "value": "Mail Delivery Subsystem <mailer-daemon@googlemail.com>"
    },
    {
      "name": "References",
      "value": "<CAMQCtF_9D0PPupza7Hspzg90LDFEhkSiGdtusZ5SWHGjedQe_Q@mail.gmail.com>"
    },
    {
      "name": "In-Reply-To",
      "value": "<CAMQCtF_9D0PPupza7Hspzg90LDFEhkSiGdtusZ5SWHGjedQe_Q@mail.gmail.com>"
    }
  */

  const internetMsgIds = []

  for (const msg of messages) {
    if ( !msg.payload && !msg.payload.headers ) {
      continue
    }

    const byName = keyBy(msg.payload.headers, 'name')

    const reference = byName['In-Reply-To'].value // References
    const from      = byName['From'].value

    const addresses  = mimelib.parseAddresses(from)
    const recipients = addresses.filter(a => { if (a.address) return true }).map(a => a.address.toLowerCase())
    
    if ( recipients.includes('mailer-daemon@googlemail.com') ) {
      internetMsgIds.push(reference)
    }
  }

  return internetMsgIds
}

const fetchBouncedMessages = async function (google, TIME_IN_SECONDS) {
  const query  = `from:mailer-daemon@googlemail.com after:${TIME_IN_SECONDS}`
  const fields = getFields('headers')

  // let rateLimitExceeded = false
  let messages     = []
  let rawMessages  = []

  for await (const response of google.filterMessagesByQuery(query, 25)) {
    if(!response.data.messages) {
      break
    }

    const ids = response.data.messages.map(message => message.id)
    const batchRawResult = await google.batchGetMessages(ids, fields)

    if (batchRawResult.error) {
      if ( batchRawResult.error.code === 429 || batchRawResult.error.code === 430 ) {
        // rateLimitExceeded = true
        break
      }
    }
    
    messages    = messages.concat(response.data.messages)
    rawMessages = rawMessages.concat(batchRawResult)
  }

  // if (rateLimitExceeded) {
  //   return {
  //     rawMessages: null,
  //     error: {
  //       message: 'rateLimitExceeded',
  //       status: 429, 
  //       statusCode: 429
  //     }
  //   }
  // }

  return handleBouncedMessages(rawMessages)
}

const setAsDelivered = async (messageIds) => {
  await Email.addEvents(messageIds, 'delivered', 'gmail')
}

const setAsFailed = async (credential, internetMsgIds) => {
  const messages = await GoogleMessage.getByInternetMessageIds(credential.id, internetMsgIds)
  const bouncedMessageIds = messages.map(m => m.message_id)

  await Email.addEvents(bouncedMessageIds, 'failed', 'gmail')
}


module.exports = {
  fetchBouncedMessages,
  setAsDelivered,
  setAsFailed
}
