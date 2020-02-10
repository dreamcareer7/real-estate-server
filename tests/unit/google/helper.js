const GoogleCredential = require('../../../lib/models/Google/credential')
const GoogleMessage    = require('../../../lib/models/Google/message')

const { generateGMesssageRecord } = require('../../../lib/models/Google/workers/gmail/common')


const google_messages_offline = require('./data/google_messages.json')



async function createGoogleCredential(user, brand) {
  const body = require('./data/google_credential')
  
  body.user  = user.id
  body.brand = brand.id

  const credentialId = await GoogleCredential.create(body)
  const credential   = await GoogleCredential.get(credentialId)

  return {
    credential,
    body
  }
}

async function createGoogleMessages(user, brand) {
  const { credential } = await createGoogleCredential(user, brand)

  const googleMessages = []

  for (const message of google_messages_offline) {
    googleMessages.push(generateGMesssageRecord(credential.id, message))
  }

  const createdMessages = await GoogleMessage.create(googleMessages, credential.id)

  return {
    createdMessages,
    credential
  }
}

module.exports = {
  createGoogleCredential,
  createGoogleMessages
}
