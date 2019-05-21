const config  = require('../../config')
const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')

const Google = require('./plugin/google')
const GmailAuthLink  = require('./gmail_auth_link')


const Gmail = {}



Gmail.granAccess = async (code, recordId) => {
  const google = Google.api()

  google.setGmailAuthRedirectToUrl(recordId)

  const gmailAuthLink = await GmailAuthLink.get(recordId)

  google.setGmailAddress(gmailAuthLink.email)

  const tokens  = await google.getAndSetGmailTokens(code)
  const profile = await google.getGmailProfile()

  const body = {
    gmailAuthLink: gmailAuthLink,
    profile: profile,
    tokens: tokens
  }

  return Gmail.create(body)
}

Gmail.findAndExtractTokens = async (user, brand, email) => {
  const TS  = new Date()
  const UTS = TS.getTime()

  const gmail = await Gmail.getByUser(user, brand)

  if(!gmail)
    return null

  const tokens = {
    'access_token': gmail.access_token,
    'refresh_token': gmail.refresh_token,
    'scope': gmail.scope,
    'expiry_date': new Date(gmail.expiry_date).getTime()
  }

  if( UTS > new Date(gmail.expiredate).getTime() ) {
    console.log()
    console.log('**** Refreshing Gmail Tokens ****')

    const google = Google.api()

    google.setCredentials(tokens)
    google.setGmailAddress(email)
    
    const newTokens = await google.refreshToken()

    await Gmail.updateTokens(gmail.id, newTokens)

    return newTokens
  }

  return tokens
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

Gmail.revokeAccess = async (user, brand, email) => {
  const google = Google.api()

  const tokens = await Gmail.findGmailAndExtractTokens(user, brand, email)

  google.setCredentials(tokens)
  google.setGmailAddress(email)

  const result = await google.revokeCredentials()
  console.log('resut:', result)

  return await Gmail.updateAsRevoked(user, brand)
}

Gmail.updateAccount = async (user, brand, email) => {
  const google = Google.api()
  const tokens = await Gmail.findGmailAndExtractTokens(user, brand, email)

  google.setCredentials(tokens)
  google.setGmailAddress(email)

  const profile = await google.getGmailProfile()
  const gmail   = await Gmail.getByUser(user, brand)

  return await Gmail.updateProfile(gmail.id, profile)
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
    return null

  return Gmail.get(ids[0])
}

Gmail.getByEmail = async (email) => {
  const ids = await db.selectIds('google/gmail/get_by_email', [email])

  if (ids.length < 1)
    return null

  return Gmail.get(ids[0])
}

Gmail.create = async (body) => {
  return db.insert('google/gmail/insert',[
    body.gmailAuthLink['user'],
    body.gmailAuthLink.brand,
    body.gmailAuthLink.email,
  
    body.profile.messagesTotal,
    body.profile.threadsTotal,
  
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