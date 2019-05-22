const config  = require('../../config')
const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')
const uuid    = require('uuid')

const Gmail        = require('./gmail')
const GooglePlugin = require('./plugin/google')

const GmailAuthLink = {}


// if user with same user/brand change the email address ???
GmailAuthLink.requestGmailAccess = async (user, brand, email) => {
  const google = GooglePlugin.api()

  const tokens = await Gmail.findAndExtractTokens(user, brand, email)
  if(tokens) {
    const gmailAuthLink = GmailAuthLink.getByUser(user, brand)

    return gmailAuthLink.url
  }

  const key = uuid()
  google.setGmailAuthRedirectToUrl(key)

  const url     = await google.getAuthenticationLink()
  const scope   = google.scope
  const webhook = google.webhook

  await GmailAuthLink.deleteAndCreateNewAuthLink(key, user, brand, email, url, webhook, scope)

  return url
}

GmailAuthLink.grantAccess = async (code, key) => {
  const google = GooglePlugin.api()
  await google.setGmailAuthRedirectToUrl(key)

  const gmailAuthLink = await GmailAuthLink.getByKey(key)

  google.setGmailAddress(gmailAuthLink.email)

  try {
    const tokens  = await google.getAndSetGmailTokens(code)
    const profile = await google.getGmailProfile()

    const body = {
      gmailAuthLink: gmailAuthLink,
      profile: profile,
      tokens: tokens
    }
  
    const gmailRecordId = await Gmail.create(body)
    const gmailRecord   = await Gmail.get(gmailRecordId)
  
    return gmailRecord

  } catch (ex) {
    console.log('----', ex)
    throw Error.ResourceNotFound(`Google-Auth-Link Bad-Credential`)
  }
}

GmailAuthLink.deleteAndCreateNewAuthLink = async (key, user, brand, email, url, webhook, scope) => {
  await GmailAuthLink.hardDelete(user, brand)
  return await GmailAuthLink.create([key, user, brand, email, url, webhook, scope])
}



GmailAuthLink.getAll = async (ids) => {
  const gmailAuthLinks = await db.select('google/gmail_auth_link/get', [ids])

  return gmailAuthLinks
}

GmailAuthLink.get = async (id) => {
  const gmailAuthLinks = await GmailAuthLink.getAll([id])

  if (gmailAuthLinks.length < 1)
    throw Error.ResourceNotFound(`Google-Auth-Link ${id} not found`)

  return gmailAuthLinks[0]
}

GmailAuthLink.getByUser = async (user, brand) => {
  const ids = await db.selectIds('google/gmail_auth_link/get_by_user', [user, brand])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-Auth-Link ${user} not found`)

  return GmailAuthLink.get(ids[0])
}

GmailAuthLink.getByLink = async (url) => {
  const ids = await db.selectIds('google/gmail_auth_link/get_by_link', [url])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-Auth-Link ${url} not found`)

  return GmailAuthLink.get(ids[0])
}

GmailAuthLink.getByKey = async (key) => {
  const ids = await db.selectIds('google/gmail_auth_link/get_by_key', [key])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-Auth-Link ${key} not found`)

  return GmailAuthLink.get(ids[0])
}

GmailAuthLink.hardDelete = async (user, brand) => {
  return await db.update('google/gmail_auth_link/delete', [user, brand])
}

GmailAuthLink.create = async (args) => {
  return db.insert('google/gmail_auth_link/insert', args)
}

Orm.register('gmailAuthLink', 'GmailAuthLink', GmailAuthLink)

module.exports = GmailAuthLink