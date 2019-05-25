const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')

const GooglePlugin     = require('./plugin')
const GoogleCredential = require('./credential')

const GoogleMessage = {}

let google

const setupClient = async function(credential) {
  if(google)
    return google

  google = await GooglePlugin.setupClient(credential)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await GoogleMessage.updateRefreshToken(credential.id, tokens.refresh_token)
      await google.setCredentials({ refresh_token: tokens.refresh_token })
    }

    await google.setCredentials({ access_token: tokens.access_token })
  })

  return google
}


GoogleMessage.listMessages = async (user, brand) => {
  const credential  = await GoogleCredential.getByUser(user, brand)
  const google = await setupClient(credential)
  
  const messages = await google.listMessages()
  const id = messages.messages[0]['id']

  const message = await google.getMessage(id)

  return message
}


Orm.register('googleMessage', 'GoogleMessage', GoogleMessage)

module.exports = GoogleMessage