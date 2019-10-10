const MicrosoftCredential = require('./credential')
const MicrosoftPlugin     = require('./plugin/graph.js')


const MicrosoftAuthLink = {}



MicrosoftAuthLink.requestMicrosoftAccess = async (user, brand, scopes, redirect) => {
  const microsoft = MicrosoftPlugin.api(true)

  const state = `${user}::${brand}::${redirect}`
  const url   = await microsoft.getAuthenticationLink(state, scopes)

  return url
}

MicrosoftAuthLink.grantAccess = async (data) => {
  const stateArr = data.state.split('::')

  if (stateArr.length !== 3)
    throw Error.BadRequest('Microsoft-Auth-Hook bad-state')

  if (!data.code)
    throw Error.BadRequest('Microsoft-Auth-Hook bad-code')

  const user     = stateArr[0]
  const brand    = stateArr[1]
  const redirect = stateArr[2]

  try {
    const microsoft  = MicrosoftPlugin.api(true)
    const tokens     = await microsoft.tokenRequest(data.code)

    const profileObj = await microsoft.getProfileNative()
    await microsoft.getProfile()

    const profile = {
      email: profileObj.userPrincipalName.toLowerCase() || profileObj.mail.toLowerCase(),
      remote_id: profileObj.id,
      firstName: profileObj.givenName,
      lastName: profileObj.surname,
      displayName: profileObj.displayName,
      photo: ''
    }

    const body = {
      user: user,
      brand: brand,
      profile: profile,
      tokens: tokens
    }

    const credentialId        = await MicrosoftCredential.create(body)
    const microsoftCredential = await MicrosoftCredential.get(credentialId)

    return { microsoftCredential: microsoftCredential, redirect: redirect }

  } catch (ex) {

    if ( ex.message === 'invalid_grant' )
      throw Error.BadRequest('Microsoft-Auth-Hook Invalid-Grant')

    throw Error.BadRequest('Microsoft-Auth-Hook Bad-Credential')
  }
}

module.exports = MicrosoftAuthLink