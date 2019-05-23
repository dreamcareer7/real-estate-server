const config  = require('../../config')
const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')

const GooglePlugin = require('./plugin/google')

const Gmail = {}

let google

const setupClient = async function(gmail) {
  if(google)
    return google

  google = await GooglePlugin.setupClient(gmail)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await Gmail.updateRefreshToken(gmail.id, tokens.refresh_token)
      await google.setCredentials({ refresh_token: tokens.refresh_token })
    }

    await google.setCredentials({ access_token: tokens.access_token })
  })

  return google
}



Gmail.checkPermission = async (user, brand) => {
  const gmailRecord = await Gmail.getByUser(user, brand)

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

Gmail.getProfile = async (user, brand) => {
  const gmail  = await Gmail.getByUser(user, brand)
  const google = await setupClient(gmail)
  
  return await google.getGmailProfile()
}

Gmail.listConnections = async (user, brand) => {
  const gmail  = await Gmail.getByUser(user, brand)
  const google = await setupClient(gmail)
  
  return await google.listConnections()
}

Gmail.listContactGroups = async (user, brand) => {
  const gmail  = await Gmail.getByUser(user, brand)
  const google = await setupClient(gmail)
  
  return await google.listContactGroups()
}



Gmail.getAll = async (ids) => {
  const gmails = await db.select('google/gmail/get', [ids])

  return gmails
}

Gmail.get = async (id) => {
  const gmails = await Gmail.getAll([id])

  if (gmails.length < 1)
    throw Error.ResourceNotFound(`Gmail ${id} not found`)

  return gmails[0]
}

Gmail.getByUser = async (user, brand) => {
  const ids = await db.selectIds('google/gmail/get_by_user', [user, brand])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Gmail ${user} not found`)

  return Gmail.get(ids[0])
}

Gmail.getByEmail = async (email) => {
  const ids = await db.selectIds('google/gmail/get_by_email', [email])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Gmail ${email} not found`)

  return Gmail.get(ids[0])
}

Gmail.create = async (body) => {
  return db.insert('google/gmail/insert',[
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

Gmail.updateTokens = async (gmailId, tokens) => {
  return db.update('google/gmail/update_tokens', [
    tokens.access_token,
    tokens.refresh_token,
    tokens.expiry_date,
    gmailId
  ])
}

Gmail.updateRefreshToken = async (gmailId, refreshToken) => {
  return db.update('google/gmail/update_refresh_token', [
    gmailId,
    refreshToken,
    new Date()
  ])
}

Gmail.updateAsRevoked = async (user, brand) => {
  return db.update('google/gmail/revoked', [
    user,
    brand
  ])
}

Gmail.updateProfile = async (id, profile) => {
  return db.update('google/gmail/update_profile', [
    profile.messagesTotal,
    profile.threadsTotal,
    id
  ])
}


Orm.register('gmail', 'Gmail', Gmail)

module.exports = Gmail