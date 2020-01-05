const GoogleCredential = require('./credential')
const GooglePlugin     = require('./plugin/googleapis.js')


const GoogleAuthLink = {}

function hasndleScopes(scope) {
  const scopeSummary = ['profile']

  if ( scope.includes('https://www.googleapis.com/auth/contacts.readonly') )
    scopeSummary.push('contacts.read')

  if ( scope.includes('https://www.googleapis.com/auth/gmail.readonly') )
    scopeSummary.push('mail.read')

  if ( scope.includes('https://www.googleapis.com/auth/gmail.send') )
    scopeSummary.push('mail.send')

  if ( scope.includes('https://www.googleapis.com/auth/gmail.modify') )
    scopeSummary.push('mail.modify')

  if ( scope.includes('https://www.googleapis.com/auth/calendar') )
    scopeSummary.push('calendar')

  return scopeSummary
}


GoogleAuthLink.requestGmailAccess = async (user, brand, scopes, redirect) => {
  const google = GooglePlugin.api()

  if (!redirect)
    redirect = 'https://rechat.com/dashboard/contacts?letter&s=0'

  const state = `${user}::${brand}::${redirect}`

  const url = await google.getAuthenticationLink(state, scopes)

  return url
}

GoogleAuthLink.grantAccess = async (data) => {
  const scope    = data.scope.split(' ')
  const stateArr = data.state.split('::')

  if (stateArr.length !== 3)
    throw Error.BadRequest('Google-Auth-Hook bad-state')

  if (!data.code)
    throw Error.BadRequest('Google-Auth-Hook bad-code')

  const user     = stateArr[0]
  const brand    = stateArr[1]
  const redirect = stateArr[2]

  if ( !scope.includes('email') || !scope.includes('profile') )
    throw Error.BadRequest('Google-Auth-Hook Insufficient-Permission')

  try {
    const google     = GooglePlugin.api()
    const tokens     = await google.getAndSetTokens(data.code)
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
        profile.emailAddress = emailAddress.value.toLowerCase()
    }

    if( scope.includes('https://www.googleapis.com/auth/gmail.readonly') ) {
      const gmailProfile = await google.getGmailProfile()

      profile.messagesTotal = gmailProfile.messagesTotal
      profile.threadsTotal  = gmailProfile.threadsTotal
      profile.historyId     = gmailProfile.historyId
    }

    const scopeSummary = hasndleScopes(scope)

    const body = {
      user: user,
      brand: brand,
      profile: profile,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: Math.round(tokens.expiry_date / 1000),
        scope: tokens.scope.split(' ')
      },
      scope: scope,
      scopeSummary: scopeSummary
    }

    const credentialId     = await GoogleCredential.create(body)
    const googleCredential = await GoogleCredential.get(credentialId)

    return { googleCredential: googleCredential, redirect: redirect }

  } catch (ex) {

    if ( ex.message === 'invalid_grant' )
      throw Error.BadRequest('Google-Auth-Hook Invalid-Grant')

    if ( ex.message === 'Insufficient Permission' )
      throw Error.BadRequest('Google-Auth-Hook Insufficient-Permission')

    throw Error.BadRequest('Google-Auth-Hook Bad-Credential')
  }
}


module.exports = GoogleAuthLink