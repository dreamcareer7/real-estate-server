const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')

const GooglePlugin = require('./plugin')

const GoogleCredential = {}

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



GoogleCredential.checkPermission = async (user, brand) => {
  const credential = await GoogleCredential.getByUser(user, brand)

  if(!credential) {
    return false
    // return res.status(404).json({ status: false, message: 'no-gmail-access' })
  }

  if(credential.revoked) {
    return false
    // return res.json({ status: true, message: 'already-revokeded' })
  }

  return true
}

GoogleCredential.getProfile = async (user, brand) => {
  const credential = await GoogleCredential.getByUser(user, brand)
  const google     = await setupClient(credential)
  
  const profile = await google.getGmailProfile()
  await GoogleCredential.updateProfile(credential.id, profile)

  return profile
}


GoogleCredential.getAll = async (ids) => {
  const credentials = await db.select('google/credential/get', [ids])

  return credentials
}

GoogleCredential.get = async (id) => {
  const credentials = await GoogleCredential.getAll([id])

  if (credentials.length < 1)
    throw Error.ResourceNotFound(`Google-Credential ${id} not found`)

  return credentials[0]
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
    profile.historyId,
    id
  ])
}

GoogleCredential.updateContactsSyncToken = async (gmailId, syncToken) => {
  return db.update('google/credential/update_contacts_sync_token', [
    gmailId,
    syncToken,
    new Date()
  ])
}


Orm.register('googleCredential', 'GoogleCredential', GoogleCredential)

module.exports = GoogleCredential