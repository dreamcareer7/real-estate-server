const db   = require('../../utils/db.js')
const Orm  = require('../Orm')

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

    await GoogleCredential.updateAccesshToken(credential.id, tokens.access_token)
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
      return false
  }

  return true
}

GoogleAuthLink.requestGmailAccess = async (user, brand, redirect) => {
  const google = GooglePlugin.api()

  const state = `${user}::${brand}::${redirect}`
  const url   = await google.getAuthenticationLink(state)
  const scope = google.scope

  await GoogleAuthLink.deleteAndCreateNewAuthLink(user, brand, url, scope)

  const authLinkRecord = await GoogleAuthLink.getByUser(user, brand)

  return authLinkRecord
}

GoogleAuthLink.deleteAndCreateNewAuthLink = async (user, brand, url, scope) => {
  await GoogleAuthLink.hardDelete(user, brand)
  return await GoogleAuthLink.create([user, brand, url, JSON.stringify(scope)])
}

GoogleAuthLink.grantAccess = async (data) => {
  const scope    = data.scope.split(' ')
  const stateArr = data.state.split('::')
  const user     = stateArr[0]
  const brand    = stateArr[1]
  const redirect = stateArr[2]

  if ( !scope.includes('email') || !scope.includes('profile') )
    throw Error.BadRequest('Google-Auth-Hook Insufficient-Permission')

  try {
    const google     = GooglePlugin.api()
    const tokens     = await google.getAndSetGmailTokens(data.code)
    const profileObj = await google.getProfile()
    
    const profile = {
      resourceName: profileObj.resourceName
    }

    for ( const name of profileObj.names ) {
      if ( name.metadata.primary ) {
        profile.displayName = name.displayName
        profile.firstName   = name.givenName
        profile.lastName    = name.familyName
      }
    }

    for ( const photo of profileObj.photos ) {
      if ( photo.metadata.primary )
        profile.photo = photo.url
    }

    for ( const emailAddress of profileObj.emailAddresses ) {
      if ( emailAddress.metadata.primary )
        profile.emailAddress = emailAddress.value
    }

    if( scope.includes('https://www.googleapis.com/auth/gmail.readonly') ) {
      const gmailProfile = await google.getGmailProfile()

      profile.messagesTotal = gmailProfile.messagesTotal
      profile.threadsTotal  = gmailProfile.threadsTotal
      profile.historyId     = gmailProfile.historyId
    }

    const body = {
      user: user,
      brand: brand,
      profile: profile,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        scope: tokens.scope.split(' ')
      },
      scope: scope
    }
  
    const credentialId     = await GoogleCredential.create(body)
    const googleCredential = await GoogleCredential.get(credentialId)

    return { googleCredential: googleCredential, redirect: redirect }

  } catch (ex) {

    if ( ex.message === 'invalid_grant' )
      throw Error.BadRequest('Google-Auth-Hook Invalid-Grant')

    if ( ex.message === 'Insufficient Permission' )
      throw Error.BadRequest('Google-Auth-Hook Insufficient-Permission')

    if ( ex.message === 'Google-Auth-Hook Insufficient-Permission' )
      throw Error.BadRequest('Google-Auth-Hook Insufficient-Permission')

    throw Error.BadRequest('Google-Auth-Hook Bad-Credential')
  }
}

GoogleAuthLink.revokeAccess = async (user, brand) => {
  const googleCredential = await GoogleCredential.getByUser(user, brand)

  if (!googleCredential)
    throw Error.BadRequest('You have not any connected account!')

  if (googleCredential.revoked)
    return true
 
  try {
    const google = await setupClient(googleCredential)
    await google.revokeCredentials()

  } catch (ex) {

    if ( ex.message !== 'invalid_grant' )
      throw Error.BadRequest('Google-Auth Bad-Credential')
  }

  await GoogleCredential.updateAsRevoked(user, brand)
  await GoogleAuthLink.hardDelete(user, brand)
    
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

GoogleAuthLink.hardDelete = async (user, brand) => {
  return await db.update('google/auth_link/delete', [user, brand])
}

GoogleAuthLink.create = async (args) => {
  return db.insert('google/auth_link/insert', args)
}


Orm.register('google_auth_link', 'GoogleAuthLink', GoogleAuthLink)

module.exports = GoogleAuthLink