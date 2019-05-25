const config  = require('../../config')
const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')
const uuid    = require('uuid')

const GoogleCredential = require('./credential')
const GooglePlugin     = require('./plugin/google')

const GoogleAuthLink = {}

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




GoogleAuthLink.requestGmailAccessCheck = async (user, brand, email) => {
  let gmailRecord

  try {
    gmailRecord = await GoogleCredential.getByUser(user, brand)
  } catch(ex) {
    // do nothing
  }

  if(gmailRecord) {
    
    if( !gmailRecord.revoked )
      throw Error.BadRequest('You have a granted gmail account already!')

    if( gmailRecord.email !== email )
      throw Error.BadRequest(`Your current granted gmail address is not same as ${email}!`)
  }

  return true
}

GoogleAuthLink.requestGmailAccess = async (user, brand, email) => {
  const google = GooglePlugin.api()

  const key = uuid()
  google.setGmailAuthRedirectToUrl(key)

  const url     = await google.getAuthenticationLink()
  const scope   = google.scope
  const webhook = google.webhook

  await GoogleAuthLink.deleteAndCreateNewAuthLink(key, user, brand, email, url, webhook, scope)

  const authLinkRecord = await GoogleAuthLink.getByUser(user, brand)

  return authLinkRecord
}

GoogleAuthLink.deleteAndCreateNewAuthLink = async (key, user, brand, email, url, webhook, scope) => {
  await GoogleAuthLink.hardDelete(user, brand)
  return await GoogleAuthLink.create([key, user, brand, email, url, webhook, scope])
}


GoogleAuthLink.grantAccess = async (code, key) => {
  const gmailAuthLink = await GoogleAuthLink.getByKey(key)

  try {
    const oldGmailRecord = await GoogleCredential.getByEmail(gmailAuthLink.email)

    if( !oldGmailRecord.revoked )
      return oldGmailRecord

  } catch(ex) {
    // do nothing
  }

  const google = GooglePlugin.api()
  await google.setGmailAuthRedirectToUrl(key)
  google.setGmailAddress(gmailAuthLink.email)

  try {
    const tokens      = await google.getAndSetGmailTokens(code)
    const profile     = await google.getGmailProfile()
    // const connections = await google.listConnections()

    const body = {
      gmailAuthLink: gmailAuthLink,
      profile: profile,
      tokens: tokens
    }
  
    const gmailRecordId = await GoogleCredential.create(body)
    const gmailRecord   = await GoogleCredential.get(gmailRecordId)
  
    return gmailRecord

  } catch (ex) {
    throw Error.ResourceNotFound('Google-Auth-Link Bad-Credential')
  }
}

GoogleAuthLink.revokeAccess = async (user, brand) => {
  const gmail = await GoogleCredential.getByUser(user, brand)

  if(gmail.revoked)
    return true
  
  const tokens = {
    'access_token': gmail.access_token,
    'refresh_token': gmail.refresh_token,
    'scope': gmail.scope,
    'expiry_date': new Date(gmail.expiry_date).getTime()
  }
    
  const google = await setupClient(gmail)
  const result = await google.revokeCredentials()
  console.log('resut:', result)

  await GoogleCredential.updateAsRevoked(user, brand)

  return true
}



GoogleAuthLink.getAll = async (ids) => {
  const gmailAuthLinks = await db.select('google/auth_link/get', [ids])

  return gmailAuthLinks
}

GoogleAuthLink.get = async (id) => {
  const gmailAuthLinks = await GoogleAuthLink.getAll([id])

  if (gmailAuthLinks.length < 1)
    throw Error.ResourceNotFound(`Google-Auth-Link ${id} not found`)

  return gmailAuthLinks[0]
}

GoogleAuthLink.getByUser = async (user, brand) => {
  const ids = await db.selectIds('google/auth_link/get_by_user', [user, brand])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-Auth-Link ${user} not found`)

  return GoogleAuthLink.get(ids[0])
}

GoogleAuthLink.getByLink = async (url) => {
  const ids = await db.selectIds('google/auth_link/get_by_link', [url])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-Auth-Link ${url} not found`)

  return GoogleAuthLink.get(ids[0])
}

GoogleAuthLink.getByKey = async (key) => {
  const ids = await db.selectIds('google/auth_link/get_by_key', [key])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-Auth-Link ${key} not found`)

  return GoogleAuthLink.get(ids[0])
}

GoogleAuthLink.hardDelete = async (user, brand) => {
  return await db.update('google/auth_link/delete', [user, brand])
}

GoogleAuthLink.create = async (args) => {
  return db.insert('google/auth_link/insert', args)
}


Orm.register('googleAuthLink', 'GoogleAuthLink', GoogleAuthLink)

module.exports = GoogleAuthLink