const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')

const GooglePlugin = require('./plugin/google')

const GoogleCredential = {}

let google

const setupClient = async function(gmail) {
  if(google)
    return google

  google = await GooglePlugin.setupClient(gmail)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await GoogleCredential.updateRefreshToken(gmail.id, tokens.refresh_token)
      await google.setCredentials({ refresh_token: tokens.refresh_token })
    }

    await google.setCredentials({ access_token: tokens.access_token })
  })

  return google
}



GoogleCredential.checkPermission = async (user, brand) => {
  const gmailRecord = await GoogleCredential.getByUser(user, brand)

  if(!gmailRecord) {
    return false
    // return res.status(404).json({ status: false, message: 'no-gmail-access' })
  }

  if(gmailRecord.revoked) {
    return false
    // return res.json({ status: true, message: 'already-revokeded' })
  }

  return true
}

GoogleCredential.getProfile = async (user, brand) => {
  const gmail  = await GoogleCredential.getByUser(user, brand)
  const google = await setupClient(gmail)
  
  return await google.getGmailProfile()
}

GoogleCredential.listMessages = async (user, brand) => {
  const gmail  = await GoogleCredential.getByUser(user, brand)
  const google = await setupClient(gmail)
  
  const messages = await google.listMessages()
  const id = messages.messages[0]['id']

  const message = await google.getMessage(id)

  return message
}

GoogleCredential.listConnections = async (user, brand) => {
  const gmail  = await GoogleCredential.getByUser(user, brand)
  const google = await setupClient(gmail)

  const currentSyncToken = '^MisA7pC7HgAAABII9Y2KtdKy4gIQ9Y2KtdKy4gK8Au2TfyNvnBhC4WZzTvyFOiRmODY2ZTRiOS0wMGE1LTQ5YmUtOGZhMy04ZGZhYzQ4OGE1NDU'

  const { connections, syncToken } =  await google.listConnections(currentSyncToken)

  if(syncToken)
    await GoogleCredential.updateSyncToken(gmail.id, syncToken)

  console.log('\n\n\n', 'connections.length:', connections.length, '\n', 'syncToken:', syncToken)
  console.log(connections)
}

GoogleCredential.listContactGroups = async (user, brand) => {
  const gmail  = await GoogleCredential.getByUser(user, brand)
  const google = await setupClient(gmail)
  
  return await google.listContactGroups()
}

GoogleCredential.contactCownloaderJob = async () => {
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

// GoogleCredential.updateLastContactDownloadTime = async (id, ts) => {
//   await db.update('google/gmamil/xxxx', [
//     new Date(ts),
//     id
//   ])
// }



GoogleCredential.getAll = async (ids) => {
  const gmails = await db.select('google/credential/get', [ids])

  return gmails
}

GoogleCredential.get = async (id) => {
  const gmails = await GoogleCredential.getAll([id])

  if (gmails.length < 1)
    throw Error.ResourceNotFound(`Google-Credential ${id} not found`)

  return gmails[0]
}

GoogleCredential.getByUser = async (user, brand) => {
  const ids = await db.selectIds('google/credential/get_by_user', [user, brand])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-Credential ${user} not found`)

  return GoogleCredential.get(ids[0])
}

GoogleCredential.getByEmail = async (email) => {
  const ids = await db.selectIds('google/credential/get_by_email', [email])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-Credential ${email} not found`)

  return GoogleCredential.get(ids[0])
}

GoogleCredential.create = async (body) => {
  return db.insert('google/credential/insert',[
    body.gmailAuthLink.user,
    body.gmailAuthLink.brand,
    body.gmailAuthLink.email,
  
    body.profile.messagesTotal,
    body.profile.threadsTotal,
    body.profile.historyId,
  
    body.tokens.access_token,
    body.tokens.refresh_token,
    new Date(body.tokens.expiry_date),
  
    body.tokens.scope
  ])
}

GoogleCredential.updateTokens = async (gmailId, tokens) => {
  return db.update('google/credential/update_tokens', [
    tokens.access_token,
    tokens.refresh_token,
    tokens.expiry_date,
    gmailId
  ])
}

GoogleCredential.updateRefreshToken = async (gmailId, refreshToken) => {
  return db.update('google/credential/update_refresh_token', [
    gmailId,
    refreshToken,
    new Date()
  ])
}

GoogleCredential.updateAsRevoked = async (user, brand) => {
  return db.update('google/credential/revoked', [
    user,
    brand
  ])
}

GoogleCredential.updateProfile = async (id, profile) => {
  return db.update('google/credential/update_profile', [
    profile.messagesTotal,
    profile.threadsTotal,
    id
  ])
}

GoogleCredential.updateSyncToken = async (gmailId, syncToken) => {
  return db.update('google/credential/update_sync_token', [
    gmailId,
    syncToken,
    new Date()
  ])
}


Orm.register('googleCredential', 'GoogleCredential', GoogleCredential)

module.exports = GoogleCredential