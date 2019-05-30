// @ts-nocheck
const config   = require('../../../config')
const {google} = require('googleapis')

// const prettyjson = require('prettyjson')


const GMAIL_CREDENTIALS = {
  'installed': {
    'client_id': '1012064530233-u8clnq9dg0jrodls7m0gqtruejs18vqu.apps.googleusercontent.com',
    'project_id': 'quickstart-1551860259096',
    'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
    'token_uri': 'https://oauth2.googleapis.com/token',
    'auth_provider_x509_cert_url': 'https://www.googleapis.com/oauth2/v1/certs',
    'client_secret': '5LO8lBJAeuo_G2DJKdzCtD7y',
    'redirect_uris': ['urn:ietf:wg:oauth:2.0:oob', 'http://127.0.0.1:3078/webhook/google/grant']
  }
}

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/contacts.readonly'
]

const CREDENTIALS = config.GMAIL_CREDENTIALS || GMAIL_CREDENTIALS
const SCOPES      = config.GMAIL_SCOPES || GMAIL_SCOPES


function Google(){
  this.credentials   = CREDENTIALS
  this.client_secret = CREDENTIALS.installed.client_secret
  this.client_id     = CREDENTIALS.installed.client_id
  this.scope         = SCOPES
}


Google.prototype.config = function(mode) {
  // redirectTo: link to open google authorization dialog
  // webhook: link to redirect to rechat server (webhook)

  if (mode === 'cli')
    this.redirectTo = CREDENTIALS.installed.redirect_uris[0]  
  else
    this.redirectTo = CREDENTIALS.installed.redirect_uris[1]

  this.setupOAuth2Client()
}

Google.prototype.setupOAuth2Client = function() {
  this.oAuth2Client = new google.auth.OAuth2(this.client_id, this.client_secret, this.redirectTo)
}

Google.prototype.setGmailAddress = async function(gmailAddress) {
  this.gmailAddress = gmailAddress
}

Google.prototype.setGmailAuthRedirectToUrl = async function(key) {
  this.redirectTo += ('/' + key)
  this.webhook = this.redirectTo
  this.setupOAuth2Client()
}

Google.prototype.setCredentials = async function(tokens) {
  this.oAuth2Client.setCredentials(tokens)
}

Google.prototype.refreshToken = async function() {
  const { newTokens } = await this.oAuth2Client.refreshAccessToken()

  await this.oAuth2Client.setCredentials(newTokens)
  return newTokens
}

Google.prototype.revokeCredentials = async function() {
  const result = await this.oAuth2Client.revokeCredentials()

  return result
}

Google.prototype.getAuthenticationLink = async function() {
  const authUrl = await this.oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  })

  return authUrl
}

Google.prototype.getAndSetGmailTokens = async function(code) {
  const result = await this.oAuth2Client.getToken(code)

  await this.setCredentials(result.tokens)

  return result.tokens
}


// Profile
Google.prototype.getGmailProfile = async function() {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const response = await gmail.users.getProfile({ auth: this.oAuth2Client, userId: 'me' })

  return response.data
}


// Messages, Threads
Google.prototype.listMessages = async function(pageToken = null) {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  /*
    options
      includeSpamTrash: Boolean
      labelIds: [], // Only return messages with labels that match all of the specified label IDs
      pageToken: ''
      q: 'text'
  */

  const response = await gmail.users.messages.list({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    maxResults: 10,
    includeSpamTrash: false,
    pageToken: pageToken
  })

  // console.log('\n\nmessages:', prettyjson.render(response.data));

  return response.data
}

Google.prototype.getMessage = async function(messageId) {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const response = await gmail.users.messages.get({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    id: messageId
  })

  // console.log('\n\nmessage:', messageId, prettyjson.render(response.data));

  return response.data
}

Google.prototype.listLabels = async function() {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const response = await gmail.users.labels.list({
    auth: this.oAuth2Client,
    userId: this.gmailAddress
  })

  return response.data
}

Google.prototype.listThreads = async function(pageToken = null) {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  /*
    Options
      includeSpamTrash: false
      labelIds: [], // Only return messages with labels that match all of the specified label IDs
      pageToken: ''
      q: 'text'
  */

  const response = await gmail.users.threads.list({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    maxResults: 10
  })

  // console.log('threads:', prettyjson.render(response.data));

  return response.data
}

Google.prototype.getThread = async function(threadId) {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const response = await gmail.users.threads.get({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    id: threadId,
    format: 'full' // metadata, minimal
  })

  // console.log('A Thread:', prettyjson.render(response.data));

  return response.data
}


// Contacts (pageSize: between 1 and 2000, inclusive. Defaults to 100)
Google.prototype.listConnections = async function(currentSyncToken = null) {
  const currentGmailAddress = this.gmailAddress
  const auth   = this.oAuth2Client
  const people = google.people({ version: 'v1', auth })

  const expTokenMsg  = 'Sync token is expired. Clear local cache and retry call without the sync token.'
  const personFields = 'metadata,addresses,birthdays,coverPhotos,emailAddresses,events,genders,locales,memberships,names,nicknames,occupations,organizations,phoneNumbers,photos,relations,sipAddresses,skills,taglines,urls,userDefined'
  let counter        = 1
  let connections    = []
  let syncToken      = currentSyncToken
  let nextPageToken
  let response

  do {

    try {
      console.log('------- listConnections loop#', counter, '\n')

      response = await people.people.connections.list({
        personFields: personFields,
        resourceName: 'people/me',
        pageSize: 2,
        requestSyncToken: true,
        pageToken: nextPageToken,
        syncToken: syncToken
      })

    } catch (ex) {

      if ( ex.message !== expTokenMsg ) {
        console.log('unexpectedexception, googleapis-listConnections', ex)
        throw Error.Conflict({ details: {
          attributes: { email: currentGmailAddress },
          info: { method: 'google.listConnections', currentSyncToken: currentSyncToken }
        }})
      }

      response = await people.people.connections.list({
        personFields: personFields,
        resourceName: 'people/me',
        pageSize: 2,
        requestSyncToken: true,
        pageToken: nextPageToken,
        syncToken: ''
      })

    } finally {
  
      nextPageToken = response.data.nextPageToken || null
      syncToken     = response.data.nextSyncToken

      if (response.data.connections)
        connections = connections.concat(response.data.connections)
  
      counter ++
    }

  } while ( nextPageToken !== null )

  return {
    connections,
    syncToken
  }
}

Google.prototype.listContactGroups = async function(currentSyncToken = null) {
  const auth   = this.oAuth2Client
  const people = google.people({ version: 'v1', auth })

  let counter       = 1
  let contactGroups = []
  let syncToken     = currentSyncToken
  let pageToken
  let response
  let body

  do {
    console.log('\n ------- listContactGroups loop#', counter, '\n')

    body = {
      resourceName: 'contactGroups',
      pageSize: 2
    }
    
    if (pageToken)
      body.pageToken = pageToken

    if (syncToken && !pageToken)
      body.syncToken = syncToken

    response = await people.people.get(body)

    console.log('body:', body)
    console.log('response.data:', response.data)
    console.log()

    pageToken = response.data.nextPageToken || null
    syncToken = response.data.nextSyncToken

    if (response.data.contactGroups)
      contactGroups = contactGroups.concat(response.data.contactGroups)

    counter ++

  } while ( pageToken !== null )

  return {
    contactGroups,
    syncToken
  }
}


module.exports.cli = function() {
  const gClient = new Google()
  gClient.config('cli')

  return gClient
}

module.exports.api = function() {
  const gClient = new Google()
  gClient.config('api')

  return gClient
}

module.exports.setupClient = async function(credential) {
  const gClient = new Google()

  gClient.config('api')

  gClient.setCredentials({
    'access_token': credential.access_token,
    'refresh_token': credential.refresh_token,
    'scope': credential.scope,
    'expiry_date': new Date(credential.expiry_date).getTime()
  })

  gClient.setGmailAddress(credential.email)

  return gClient
}


// links
// https://developers.google.com/gmail/api/guides/sync
// https://stackoverflow.com/users/1841839/daimto