const GoogleCredential = require('../credential')
const GoogleContact    = require('../contact')
const GooglePlugin     = require('../plugin')

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

const addConnection = async (credential, conn) => {
  const id = await GoogleContact.create(credential.id, conn)
  // const createdOrUpdated = await GoogleContact.getByResourceName(conn.resourceName)

  return id
}

const removeConnection = async (credential, conn) => {
  const oldRecord = await GoogleContact.getByResourceName(conn.resourceName)

  if(oldRecord) {
    await GoogleContact.softDelete(conn.resourceName)

  } else {

    await addConnection(credential, conn)
    await GoogleContact.softDelete(conn.resourceName)
  }

  return true
}

const syncContacts = async (data) => {
  // data: {
  //   meta: {
  //     partialSync: Boolean,
  //     action: 'sync_contacts'
  //   },
  //   googleCredential: googleCredential
  // }

  const google = await setupClient(data.googleCredential)

  const { connections, syncToken } = await google.listConnections(data.googleCredential.contacts_sync_token)

  const values = []

  for(const conn of connections) {
    if( conn.metadata.deleted )
      await removeConnection(data.googleCredential, conn)
    else
      values.push([ data.googleCredential.id, conn.resourceName, conn ])
  }

  await GoogleContact.bulkInsert(values)
  await GoogleCredential.updateContactsSyncToken(data.googleCredential.id, syncToken)
  await GoogleCredential.updateLastContactsSyncTime(data.googleCredential.id)

  return syncToken
}


module.exports = {
  syncContacts
}