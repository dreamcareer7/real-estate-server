// const GoogleMessage = require('../message')
const mimelib = require('mimelib')


const syncMessages = async (google, data) => {
  async function fetchMessages() {
    const max = 2

    let counter     = 1
    let messages    = []
    let rawMessages = []

    for await (const response of google.discreteSyncMessages()) {
      console.log('\n------- discreteSyncMessages-generator loop#', counter++)

      if(response.data.messages) {
        const result = await google.batchGetMessages(response.data.messages)

        messages    = messages.concat(response.data.messages)
        rawMessages = rawMessages.concat(result)
      }

      console.log('messages.length:', messages.length)
      console.log('rawMessages.length:', rawMessages.length)

      if( messages.length >= max )
        break
    }

    return rawMessages
  }

  const rawMessages = await fetchMessages()
  const refinedMessages = []

  for await ( const rawMessage of rawMessages ) {
    const refinedMessage = {
      id: rawMessage.id,
      threadId: rawMessage.threadId,
      labelIds: rawMessage.labelIds,
      historyId: rawMessage.historyId,
      internalDate: parseInt(rawMessage.internalDate),
      payload: {
        headers: []
      }
    }

    for ( const header of rawMessage.payload.headers ) {
      if ( header.name === 'From' ) {
        refinedMessage.payload.headers.push({
          name: header.name.toLowerCase(),
          value: header.value,
          addresses: mimelib.parseAddresses(header.value)
        })
      }

      if ( header.name === 'Bcc' ) {
        refinedMessage.payload.headers.push({
          name: header.name.toLowerCase(),
          value: header.value,
          addresses: mimelib.parseAddresses(header.value)
        })
      }

      if ( header.name === 'Cc' ) {
        refinedMessage.payload.headers.push({
          name: header.name.toLowerCase(),
          value: header.value,
          addresses: mimelib.parseAddresses(header.value)
        })
      }

      if ( header.name === 'To' ) {
        refinedMessage.payload.headers.push({
          name: header.name.toLowerCase(),
          value: header.value,
          addresses: mimelib.parseAddresses(header.value)
        })
      }

      if ( header.name === 'Subject' ) {
        refinedMessage.payload.headers.push({
          name: header.name.toLowerCase(),
          value: header.value
        })
      }

      if ( header.name === 'Date' ) {
        refinedMessage.payload.headers.push({
          name: header.name.toLowerCase(),
          value: header.value
        })
      }
    }

    refinedMessages.push(refinedMessage)
  }

  // console.log(JSON.stringify(refinedMessages))

  return true
}

module.exports = {
  syncMessages
}