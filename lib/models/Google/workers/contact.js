const GoogleCredential = require('../credential')
const GoogleContact    = require('../contact')
const GooglePlugin     = require('../plugin/googleapis.js')

// const prettyjson = require('prettyjson')


let google

const setupClient = async function(credential) {
  if(google)
    return google

  google = await GooglePlugin.setupClient(credential)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await GoogleCredential.updateRefreshToken(credential.id, tokens.refresh_token)
      await google.setCredentials({ refresh_token: tokens.refresh_token })
    }

    await google.setCredentials({ access_token: tokens.access_token })
  })

  return google
}

const removeConnection = async (credential, conn) => {
  const oldRecord = await GoogleContact.getByResourceName(conn.resourceName)

  if(oldRecord)
    await GoogleContact.delete(conn.resourceName)

  return true
}

const syncContacts = async (data) => {
  const google = await setupClient(data.googleCredential)

  const { connections, syncToken } = await google.listConnections(data.googleCredential.contacts_sync_token)

  const records = []

  for(const conn of connections) {
    if( conn.metadata.deleted )
      await removeConnection(data.googleCredential, conn)
    else
      records.push({ google_credential: data.googleCredential.id, resource_name: conn.resourceName, meta: JSON.stringify(conn) })
  }

  await GoogleContact.create(records)
  await GoogleCredential.updateContactsSyncToken(data.googleCredential.id, syncToken)

  return syncToken
}


module.exports = {
  syncContacts
}