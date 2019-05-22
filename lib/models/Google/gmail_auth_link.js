const config  = require('../../config')
const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')
const uuid    = require('uuid')

const Gmail        = require('./gmail')
const GooglePlugin = require('./plugin/google')

const GmailAuthLink = {}



GmailAuthLink.requestGmailAccess = async (user, brand, email) => {
  const google = GooglePlugin.api()

  const tokens = await Gmail.findAndExtractTokens(user, brand, email)
  if(tokens) {
    const gmailAuthLink = GmailAuthLink.getByUser(user, brand)

    return gmailAuthLink.url
  }

  const gmailAuthLinkRecordId = uuid()
  google.setGmailAuthRedirectToUrl(gmailAuthLinkRecordId)

  const url     = await google.getAuthenticationLink()
  const scope   = google.scope.join(' ')
  const webhook = google.webhook

  await GmailAuthLink.deleteAndCreateNewAuthLink(user, brand, email, url, webhook, scope)

  return url
}

GmailAuthLink.grantAccess = async (code, recordId) => {
  const google = GooglePlugin.api()

  google.setGmailAuthRedirectToUrl(recordId)

  const gmailAuthLink = await GmailAuthLink.get(recordId)
  console.log('gmailAuthLink', gmailAuthLink)

  google.setGmailAddress(gmailAuthLink.email)

  try {
    const tokens  = await google.getAndSetGmailTokens(code)
    const profile = await google.getGmailProfile()

    const body = {
      gmailAuthLink: gmailAuthLink,
      profile: profile,
      tokens: tokens
    }
  
    const gmailRecordId = Gmail.create(body)
    const gmailRecord   = await Gmail.get(gmailRecordId)
  
    return gmailRecord

  } catch (ex) {
    throw Error.ResourceNotFound(`Google-Auth-Link Bad-Credential`)
  }
}

GmailAuthLink.deleteAndCreateNewAuthLink = async (user, brand, email, url, webhook, scope) => {
  await db.update('google/gmail_auth_link/delete', [user, brand])

  return db.insert('google/gmail_auth_link/insert',[
    user,
    brand,
    email,
    url,
    webhook,
    scope
  ])
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


Orm.register('gmailAuthLink', 'GmailAuthLink', GmailAuthLink)

module.exports = GmailAuthLink