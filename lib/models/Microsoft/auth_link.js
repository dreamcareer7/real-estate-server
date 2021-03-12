const Context = require('../Context')
const User = require('../User/constants')
const Brand = require('../Brand/get')

const { create, get } = require('./credential')
const { getRemoteMicrosoftCalendars, configureCalendars } = require('./calendar')
const extractAvatar = require('./workers/profile/helper.js')

const UsersJob        = require('../UsersJob/microsoft')
const MicrosoftPlugin = require('./plugin/graph.js')

const MicrosoftAuthLink = {}

const SETTING = 'disable-sensitive-integrations-for-nonagents'
const error = 'Only agents are allowed to use this feauture'

const allowed = async (user, brand_id) => {
  if (user.user_type === User.AGENT)
    return


  const parent_ids = await Brand.getParents(brand_id)
  const parents = await Brand.getAll(parent_ids)

  for(const parent of parents) {
    const disallowed = parent.settings?.[SETTING].boolean === true
    if (disallowed) throw new Error.Forbidden(error)
  }
}

function handleScopes(scope) {
  const scopeSummary = ['profile']
  
  if ( scope.includes('Contacts.Read') ) {
    scopeSummary.push('contacts.read')
  }

  if ( scope.includes('Contacts.ReadWrite') ) {
    scopeSummary.push('contacts')
  }

  if ( scope.includes('Mail.Read') ) {
    scopeSummary.push('mail.read')
  }

  // Right now we need both of Mail.send and Mail.ReadWrite to handle send-email API
  if ( scope.includes('Mail.Send') && scope.includes('Mail.ReadWrite') ) {
    scopeSummary.push('mail.send')
    scopeSummary.push('mail.modify')
  }

  if ( scope.includes('Calendars.ReadWrite') ) {
    scopeSummary.push('calendar')
  }

  return scopeSummary
}

async function handleCalendarScope(credential) {
  /*
    {
      "calendars": [
        {
          "id": "AAMkAGMzNxxxx,
          "name": "Calendar",
          "description": null,
          "permission": "read.write",
          "alreadySynced": true
        },
        {
          "id": "AAMkAGMzNxxxx,
          "name": "Custom Calendar",
          "description": null,
          "permission": "read.write",
          "alreadySynced": true
        },
        {
          "id": "AAMkAGMzNxxxx,
          "name": "Rechat (Saeed's Team)",
          "description": null,
          "permission": "read.write",
          "alreadySynced": true
        }
      ],
      "primaryCalendar": null,
      "isConfigured": false
    }
  */

  const result = await getRemoteMicrosoftCalendars(credential)

  const toStopSync = []
  const toSync     = result.calendars.map(cal => cal.id)

  await configureCalendars(credential, { toSync, toStopSync })
  await UsersJob.upsertByMicrosoftCredential(credential, 'calendar', null)
}


MicrosoftAuthLink.requestMicrosoftAccess = async (user, brand, scopes, redirect) => {
  await allowed(user, brand)

  const microsoft = MicrosoftPlugin.api(true)

  const state = `${user}::${brand}::${redirect}`
  const url   = await microsoft.getAuthenticationLink(state, scopes)

  return url
}

MicrosoftAuthLink.grantAccess = async (data) => {
  const stateArr = data.state.split('::')

  if (stateArr.length !== 3) {
    throw Error.BadRequest('Microsoft-Auth-Hook bad-state')
  }

  if (!data.code) {
    throw Error.BadRequest('Microsoft-Auth-Hook bad-code')
  }

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

    const file = await extractAvatar(microsoft, user, brand)
    if (file) {
      profile.photo = file.url
    }

    const scope        = tokens.scope.split(' ')
    const scopeSummary = handleScopes(scope)

    const body = {
      user: user,
      brand: brand,
      profile: profile,
      tokens: tokens,
      scope: scope,
      scopeSummary: scopeSummary
    }

    const credentialId = await create(body)
    const credential   = await get(credentialId)

    // Setup Google Calendars
    if ( scopeSummary.includes('calendar') ) {
      await handleCalendarScope(credential)
    }

    await UsersJob.upsertByMicrosoftCredential(credential, 'outlook', null)
    await UsersJob.upsertByMicrosoftCredential(credential, 'contacts', null)

    return {
      credential,
      redirect
    }

  } catch (ex) {

    Context.log('Microsoft-Auth-Failed', ex.message, ex)

    if ( ex.message === 'invalid_grant' ) {
      throw Error.BadRequest('Microsoft-Auth-Hook Invalid-Grant')
    }

    throw Error.BadRequest('Microsoft-Auth-Hook Bad-Credential')
  }
}

module.exports = MicrosoftAuthLink