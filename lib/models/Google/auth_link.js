const Url = require('../Url')
const Context = require('../Context')

const { create, get } = require('./credential')
const { getRemoteGoogleCalendars, configureCalendars } = require('./calendar')

const UsersJob     = require('../UsersJob/google')
const GooglePlugin = require('./plugin/googleapis.js')


const GoogleAuthLink = {}

function hasndleScopes(scope) {
  const scopeSummary = ['profile']

  if ( scope.includes('https://www.googleapis.com/auth/contacts') ) {
    scopeSummary.push('contacts')
  }

  if ( scope.includes('https://www.googleapis.com/auth/contacts.readonly') ) {
    scopeSummary.push('contacts.read')
  }

  if ( scope.includes('https://www.googleapis.com/auth/contacts.other.readonly') ) {
    scopeSummary.push('contacts.other.read')
  }

  if ( scope.includes('https://www.googleapis.com/auth/gmail.readonly') ) {
    scopeSummary.push('mail.read')
  }

  if ( scope.includes('https://www.googleapis.com/auth/gmail.send') ) {
    scopeSummary.push('mail.send')
  }

  if ( scope.includes('https://www.googleapis.com/auth/gmail.modify') ) {
    scopeSummary.push('mail.modify')
  }

  if ( scope.includes('https://www.googleapis.com/auth/calendar') ) {
    scopeSummary.push('calendar')
  }

  return scopeSummary
}

async function handleCalendarScope(credential) {
  /*
    {
      "calendars": [
        {
          "id": "jfbqte89j1nfnll5v58tsg5tdk@group.calendar.google.com",
          "name": "Rechat",
          "description": "Rechat Google Calendar.\nTeam: Saeed's Team",
          "timeZone": "UTC",
          "permission": "read.write",
          "alreadySynced": false
        },
        {
          "id": "heshmat.zapata@gmail.com",
          "name": "heshmat.zapata@gmail.com",
          "description": null,
          "timeZone": "America/New_York",
          "permission": "read.write",
          "alreadySynced": false
        },
        {
          "id": "achp190jbk2rbn7d702l4mmojs@group.calendar.google.com",
          "name": "Custom Calendar",
          "description": "This is a custom description",
          "timeZone": "America/New_York",
          "permission": "read.write",
          "alreadySynced": false
        }
      ],
      "primaryCalendar": null,
      "isConfigured": false
    }
  */

  const result = await getRemoteGoogleCalendars(credential)

  const toStopSync = []
  const toSync     = result.calendars.map(cal => cal.id)

  await configureCalendars(credential, { toSync, toStopSync })
  await UsersJob.upsertByGoogleCredential(credential, 'calendar', null)
}


GoogleAuthLink.requestGmailAccess = async (user, brand, scopes, redirect) => {
  const google = GooglePlugin.api()

  if (!redirect) {
    redirect = Url.web({ uri: '/dashboard/contacts' })
  }

  const state = `${user}::${brand}::${redirect}`

  const url = await google.getAuthenticationLink(state, scopes)

  return url
}

GoogleAuthLink.grantAccess = async (data) => {
  const scope    = data.scope.split(' ')
  const stateArr = data.state.split('::')

  if (stateArr.length !== 3) {
    throw Error.BadRequest('Google-Auth-Hook bad-state')
  }

  if (!data.code) {
    throw Error.BadRequest('Google-Auth-Hook bad-code')
  }

  const user     = stateArr[0]
  const brand    = stateArr[1]
  const redirect = stateArr[2]

  if ( !scope.includes('email') || !scope.includes('profile') ) {
    throw Error.BadRequest('Google-Auth-Hook Insufficient-Permission')
  }

  try {
    const google     = GooglePlugin.api()
    const tokens     = await google.getAndSetTokens(data.code)
    const profileObj = await google.getProfileNative()

    Context.log('GoogleAuthLink.requestGmailAccess profileObj:', profileObj)

    const profile = {
      resourceName: profileObj.resourceName
    }

    if (profileObj.names) {
      for ( const name of profileObj.names ) {
        if ( name.metadata && name.metadata.primary ) {
          profile.displayName = name.displayName
          profile.firstName   = name.givenName
          profile.lastName    = name.familyName
        }
      }
    }

    if (profileObj.photos) {
      for ( const photo of profileObj.photos ) {
        if ( photo.metadata && photo.metadata.primary ) {
          profile.photo = photo.url
        }
      }
    }

    if (profileObj.emailAddresses) {
      for ( const emailAddress of profileObj.emailAddresses ) {
        if ( emailAddress.value && emailAddress.metadata && emailAddress.metadata.primary ) {
          profile.emailAddress = emailAddress.value.toLowerCase()
        }
      }
    }

    if( scope.includes('https://www.googleapis.com/auth/gmail.readonly') ) {
      const gmailProfile = await google.getGmailProfile()

      profile.messagesTotal = gmailProfile.messagesTotal
      profile.threadsTotal  = gmailProfile.threadsTotal
      profile.historyId     = gmailProfile.historyId
    }

    Context.log('GoogleAuthLink.requestGmailAccess profile:', profile)

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

    Context.log('GoogleAuthLink.requestGmailAccess body:', body)

    const credentialId = await create(body)
    const credential   = await get(credentialId)


    // Setup Google Calendars
    if ( scopeSummary.includes('calendar') ) {
      await handleCalendarScope(credential)
    }

    await UsersJob.upsertByGoogleCredential(credential, 'gmail', null)
    await UsersJob.upsertByGoogleCredential(credential, 'contacts', null)

    return {
      credential,
      redirect
    }

  } catch (ex) {

    if ( ex.message === 'invalid_grant' ) {
      throw Error.BadRequest('Google-Auth-Hook Invalid-Grant')
    }

    if ( ex.message === 'Insufficient Permission' ) {
      throw Error.BadRequest('Google-Auth-Hook Insufficient-Permission')
    }

    Context.log('GoogleAuthLink.requestGmailAccess failed!', ex)
    throw Error.BadRequest('Google-Auth-Hook Bad-Credential')
  }
}


module.exports = GoogleAuthLink