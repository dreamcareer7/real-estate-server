const config  = require('../../config')
const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')
const uuid    = require('uuid')

const Gmail  = require('./gmail')
const Google = require('./plugin/google')

const GmailAuthLink = {}


GmailAuthLink.requestGmailAccess = async (user, brand, email) => {
  const google = Google.api()

  const tokens = await Gmail.findAndExtractTokens(user, brand, email)
  if(tokens) {
    const gmailAuthLink = GmailAuthLink.getByUser(user, brand)

    return gmailAuthLink.url
  }

  const gmailAuthLinkRecordId = uuid()
  google.setGmailAuthRedirectToUrl(gmailAuthLinkRecordId)

  const authUrl = await google.getAuthenticationLink()
  const scope   = google.scope.join(' ')

  await GmailAuthLink.deleteAndCreateNewAuthLink(user, brand, email, authUrl, scope)

  return authUrl
}

GmailAuthLink.deleteAndCreateNewAuthLink = async (user, brand, email, authUrl, scope) => {
  await db.update('google/gmail_auth_link/delete', [user, brand])

  return db.insert('google/gmail_auth_link/insert',[
    user,
    brand,
    email,
    authUrl,
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
    return null

  return gmailAuthLinks[0]
}

GmailAuthLink.getByUser = async (user, brand) => {
  const ids = await db.selectIds('google/gmail_auth_link/get_by_user', [user, brand])

  if (ids.length < 1)
    return null

  return GmailAuthLink.get(ids[0])
}

GmailAuthLink.getByLink = async (url) => {
  const ids = await db.selectIds('google/gmail_auth_link/get_by_link', [url])

  if (ids.length < 1)
    return null

  return GmailAuthLink.get(ids[0])
}


Orm.register('gmailAuthLink', 'GmailAuthLink', GmailAuthLink)

module.exports = GmailAuthLink