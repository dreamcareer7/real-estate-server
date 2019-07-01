const MicrosoftCredential = require('./credential')
const MicrosoftPlugin     = require('./plugin/graph.js')


const MicrosoftAuthLink = {}


const setupClient = async function(credential) {
  const microsoft = await MicrosoftPlugin.setupClient(credential)

  // handle new tokens ???

  // microsoft.oAuth2Client.on('tokens', async (tokens) => {
  //   if (tokens.refresh_token) {
  //     await MicrosoftCredential.updateRefreshToken(credential.id, tokens.refresh_token)
  //     await microsoft.setCredentials({ refresh_token: tokens.refresh_token })
  //   }

  //   await MicrosoftCredential.updateAccesshToken(credential.id, tokens.access_token)
  //   await microsoft.setCredentials({ access_token: tokens.access_token })
  // })

  return microsoft
}



MicrosoftAuthLink.requestMicrosoftAccess = async (user, brand, redirect) => {
  const microsoft = MicrosoftPlugin.api(true)

  const state = `${user}::${brand}::${redirect}`
  const url   = await microsoft.getAuthenticationLink(state)

  return url
}

MicrosoftAuthLink.grantAccess = async (data) => {
  const stateArr = data.state.split('::')
  const user     = stateArr[0]
  const brand    = stateArr[1]
  const redirect = stateArr[2]

  try {
    const microsoft  = MicrosoftPlugin.api(true)
    const tokens     = await microsoft.tokenRequest(data.code)

    const profileObj = await microsoft.getProfileNative()
    await microsoft.getProfile()

    const profile = {
      email: profileObj.userPrincipalName || profileObj.mail,
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

MicrosoftAuthLink.revokeAccess = async (id) => {
  const microsoftCredential = await MicrosoftCredential.get(id)

  try {
    const microsoft = await setupClient(microsoftCredential)
    await microsoft.revokeCredentials()

  } catch (ex) {

    if ( ex.message !== 'invalid_grant' )
      throw Error.BadRequest('Microsoft-Auth Bad-Credential')

    throw Error.BadRequest('Microsoft-Auth Revoke failed!')
  }

  await MicrosoftCredential.updateAsRevoked(microsoftCredential.id)
    
  return true
}


module.exports = MicrosoftAuthLink