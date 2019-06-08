const db   = require('../../utils/db.js')
const Orm  = require('../Orm')
const uuid = require('uuid')

const GoogleCredential = require('./credential')
const GooglePlugin     = require('./plugin/googleapis.js')

const GoogleAuthLink = {}

let google

const setupClient = async function(credential) {
  if (google)
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


GoogleAuthLink.requestGmailAccessCheck = async (user, brand) => {
  let googleCredential

  try {
    googleCredential = await GoogleCredential.getByUser(user, brand)
  } catch(ex) {
    // do nothing
  }

  if (googleCredential) {
    
    if ( !googleCredential.revoked )
      throw Error.BadRequest('You have a granted gmail account already!')
  }

  return true
}

GoogleAuthLink.requestGmailAccess = async (user, brand, redirect) => {
  const google = GooglePlugin.api()

  const key = uuid()
  // google.setGmailAuthRedirectToUrl(key)

  const url   = await google.getAuthenticationLink()
  const scope = google.scope

  await GoogleAuthLink.deleteAndCreateNewAuthLink(key, user, brand, url, redirect, scope)

  const authLinkRecord = await GoogleAuthLink.getByUser(user, brand)

  return authLinkRecord
}

GoogleAuthLink.deleteAndCreateNewAuthLink = async (key, user, brand, url, redirect, scope) => {
  await GoogleAuthLink.hardDelete(user, brand)
  return await GoogleAuthLink.create([key, user, brand, url, redirect, scope])
}

/*
  tokens {
    access_token: 'ya29.GlsiBwojVZbCmE4gWPDA3hZsTJdfScWUeAalqnYTu1BFCpJghqgpDAeSC7CKsausJ5NcdBfPQAXcCGRIPYM_RI-CBjb8V-WP2sFsfEbkq2shxIBUGlqyFxlDofWt',
    refresh_token: '1/a7U6961jfrMyu-avSwaM5DB-jAqaWUHeZv5TRH5YGPOsLUXjsb7XwzyVZxxvxtjb',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly',
    token_type: 'Bearer',
    expiry_date: 1560008893003
  }
  profile {
    emailAddress: 'saeed@rechat.com',
    messagesTotal: 7,
    threadsTotal: 7,
    historyId: '2083'
  }
*/

GoogleAuthLink.grantAccess = async (code) => {
  // const gmailAuthLink = await GoogleAuthLink.getByKey(key)

  // try {
  //   const oldGoogleCredential = await GoogleCredential.getByUser(gmailAuthLink.user, gmailAuthLink.brand)

  //   if ( !oldGoogleCredential.revoked )
  //     return { googleCredential: oldGoogleCredential, authRecord: gmailAuthLink }

  // } catch(ex) {
  //   // do nothing
  // }

  const google = GooglePlugin.api()
  // await google.setGmailAuthRedirectToUrl(key)

  try {
    const tokens  = await google.getAndSetGmailTokens(code)
    const profile = await google.getGmailProfile()

    console.log('tokens', tokens)
    console.log('profile', profile)

    // const body = {
    //   gmailAuthLink: gmailAuthLink,
    //   profile: profile,
    //   tokens: tokens
    // }
  
    // const credentialId     = await GoogleCredential.create(body)
    // const googleCredential = await GoogleCredential.get(credentialId)
  
    // return { googleCredential: googleCredential, authRecord: gmailAuthLink }

  } catch (ex) {
    throw Error.ResourceNotFound('Google-Auth-Link Bad-Credential')
  }
}

GoogleAuthLink.revokeAccess = async (user, brand) => {
  const googleCredential = await GoogleCredential.getByUser(user, brand)

  if (!googleCredential)
    throw Error.BadRequest('You have not any connected account!')

  if (googleCredential.revoked)
    return true
 
  const google = await setupClient(googleCredential)
  await google.revokeCredentials()

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


Orm.register('google_auth_link', 'GoogleAuthLink', GoogleAuthLink)

module.exports = GoogleAuthLink