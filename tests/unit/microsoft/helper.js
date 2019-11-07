const MicrosoftCredential = require('../../../lib/models/Microsoft/credential')
const MicrosoftMessage    = require('../../../lib/models/Microsoft/message')

const { generateMMesssageRecord } = require('../../../lib/models/Microsoft/workers/messages/common')

const microsoft_messages_offline = require('./data/microsoft_messages.json')



async function createMicrosoftCredential(user, brand) {
  const body = require('./data/microsoft_credential')
  
  body.user  = user.id
  body.brand = brand.id

  const credentialId = await MicrosoftCredential.create(body)
  const credential   = await MicrosoftCredential.get(credentialId)

  return {
    credential,
    body
  }
}

async function createMicrosoftMessages(user, brand) {
  const { credential } = await createMicrosoftCredential(user, brand)

  const microsoftMessages = []

  for ( const message of microsoft_messages_offline ) {
    microsoftMessages.push(generateMMesssageRecord(credential, message))
  }

  const createdMessages = await MicrosoftMessage.create(microsoftMessages)

  return {
    createdMessages,
    credential
  }
}

module.exports = {
  createMicrosoftCredential,
  createMicrosoftMessages
}