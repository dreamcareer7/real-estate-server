const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')

const GooglePlugin     = require('./plugin')
const GoogleCredential = require('./credential')

const GoogleContact = {}

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



GoogleContact.listConnections = async (user, brand) => {
  const credential  = await GoogleCredential.getByUser(user, brand)
  const google = await setupClient(credential)

  const currentSyncToken = ''

  const { connections, syncToken } = await google.listConnections(currentSyncToken)

  if(syncToken)
    await GoogleCredential.updateContactsSyncToken(credential.id, syncToken)

  const createdContactIds = []

  for(const conn of connections) {
    if( conn.metadata.deleted ) {
      try {
        console.log(conn)
        const res = await GoogleContact.softDelete(conn.resourceName)
        console.log('\n---', res)
  
        const deleted = await GoogleContact.getByResourceName(conn.resourceName)
        console.log('\n deleted:', deleted, '\n')
      } catch(ex) {
        console.log(ex)
      }

    } else {

      const id = await GoogleContact.create(credential.id, conn)
      createdContactIds.push(id)

      const createdOrUpdated = await GoogleContact.getByResourceName(conn.resourceName)
      console.log('\n createdOrUpdated:', createdOrUpdated, '\n')
    }
  }

  console.log('\n\n\n', 'connections.length:', connections.length, '\n', 'syncToken:', syncToken)
  console.log('\n connections', JSON.stringify(connections))
  console.log('\n createdContactIds', JSON.stringify(createdContactIds))
}

GoogleContact.listContactGroups = async (user, brand) => {
  const credential  = await GoogleCredential.getByUser(user, brand)
  const google = await setupClient(credential)
  
  return await google.listContactGroups()
}

GoogleContact.contactCownloaderJob = async () => {
  const rows = await db.select('google/credential/xxx', [])
  const ids  = rows.map(r => r.id)

  let isFirstCrawl = true

  for(const showing_credential_id of ids) {
    const showingCredential = await ShowingsCredential.get(showing_credential_id)

    if( showingCredential.last_crawled_at )
      isFirstCrawl = false

    // action enum : showings / appoinmentsForBuyers
    const data = {
      meta: {
        isFirstCrawl: isFirstCrawl,
        action: 'showings'
      },
      showingCredential: showingCredential
    }

    const job = Job.queue.create('showings_crawler', data).removeOnComplete(true)
    Context.get('jobs').push(job)
  }

  return ids
}

// GoogleContact.updateLastContactDownloadTime = async (id, ts) => {
//   await db.update('google/gmamil/xxxx', [
//     new Date(ts),
//     id
//   ])
// }




GoogleContact.getAll = async (ids) => {
  const contacts = await db.select('google/contact/get', [ids])

  return contacts
}

GoogleContact.get = async (id) => {
  const contacts = await GoogleContact.getAll([id])

  if (contacts.length < 1)
    throw Error.ResourceNotFound(`Google-Contact ${id} not found`)

  return contacts[0]
}

GoogleContact.getByResourceName = async (resource_name) => {
  const ids = await db.selectIds('google/contact/get_by_resource_name', [resource_name])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-Contact ${resource_name} not found`)

  return GoogleContact.get(ids[0])
}

GoogleContact.create = async (google_credential, meta) => {
  return db.insert('google/contact/insert',[
    google_credential,
    meta.resourceName,
    meta
  ])
}

GoogleContact.softDelete = async (resource_name) => {
  return db.update('google/contact/soft_delete', [ resource_name, new Date() ])
}


Orm.register('googleContact', 'GoogleContact', GoogleContact)

module.exports = GoogleContact