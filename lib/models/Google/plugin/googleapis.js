// @ts-nocheck
const config = require('../../../config')
const util   = require('util')

const {google}   = require('googleapis')
const prettyjson = require('prettyjson')


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

  if(mode === 'cli')
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
  const refreshAccessToken = util.promisify(this.oAuth2Client.refreshAccessToken)
  const { newTokens }      = await refreshAccessToken()

  await this.oAuth2Client.setCredentials(newTokens)
  return newTokens
}

Google.prototype.revokeCredentials = async function() {
  const revokeCredentials = util.promisify(this.oAuth2Client.revokeCredentials)
  const result            = await revokeCredentials()

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

  const getProfile = util.promisify(gmail.users.getProfile)
  const response   = await getProfile({ auth: this.oAuth2Client, userId: this.gmailAddress })

  console.log()
  console.log('------- Profile -------')
  console.log()
  console.log('Profile:', prettyjson.render(response.data))
  console.log()

  return response.data
}


// Messages
Google.prototype.listMessages = async function(pageToken = null) {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const listMessages = util.promisify(gmail.users.messages.list)

  /*
    options
      includeSpamTrash: Boolean
      labelIds: [], // Only return messages with labels that match all of the specified label IDs
      pageToken: ''
      q: 'text'
  */

  const response = await listMessages({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    maxResults: 10,
    includeSpamTrash: false,
    pageToken: pageToken
  })

  console.log()
  console.log('------- Messages -------')
  console.log()
  console.log('Messages:', prettyjson.render(response.data))
  console.log()

  return response.data
}

Google.prototype.getMessage = async function(messageId) {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const getMessage = util.promisify(gmail.users.messages.get)
  const response   = await getMessage({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    id: messageId
  })

  console.log()
  console.log('------- Single Message -------')
  console.log()
  console.log('Single Message:', prettyjson.render(response.data))
  console.log()

  return response.data
}

Google.prototype.listLabels = async function() {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const listLabels = util.promisify(gmail.users.labels.list)
  const response   = await listLabels({
    auth: this.oAuth2Client,
    userId: this.gmailAddress
  })

  return response.data
}

Google.prototype.listThreads = async function(pageToken = null) {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const listThreads = util.promisify(gmail.users.threads.list)

  /*
    Options
      includeSpamTrash: false
      labelIds: [], // Only return messages with labels that match all of the specified label IDs
      pageToken: ''
      q: 'text'
  */

  const response = await listThreads({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    maxResults: 10
  })

  return response.data
}

Google.prototype.getThread = async function(threadId) {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const getThread = util.promisify(gmail.users.threads.get)
  const response  = await getThread({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    id: threadId,
    format: 'full' // metadata, minimal
  })

  return response.data
}


// Contacts
// pageSize: between 1 and 2000, inclusive. Defaults to 100
Google.prototype.listConnections = async function(currentSyncToken = null) {
  const currentGmailAddress = this.gmailAddress
  const auth   = this.oAuth2Client
  const people = google.people({ version: 'v1', auth })

  const listConnections = util.promisify(people.people.connections.list)

  const personFields = 'metadata,addresses,birthdays,coverPhotos,emailAddresses,events,genders,locales,memberships,names,nicknames,occupations,organizations,phoneNumbers,photos,relations,sipAddresses,skills,taglines,urls,userDefined'
  let nextPageToken
  let syncToken = currentSyncToken
  let response
  let connections = []
  let counter = 1


  do {

    try {
      console.log('\n --------------------------------')
      console.log('loop#', counter, '\n')

      response = await listConnections({
        personFields: 'names,metadata',
        resourceName: 'people/me',
        pageSize: 2,
    
        requestSyncToken: true,
        pageToken: nextPageToken,
        syncToken: syncToken
      })

    } catch (ex) {
      console.log('ex.message:', ex.message)

      if(ex.message !== 'Sync token is expired. Clear local cache and retry call without the sync token.') {
        console.log('unexpectedexception, googleapis-listConnections', ex)
        throw Error.Conflict({ details: {
          attributes: { email: currentGmailAddress },
          info: { method: 'google.listConnections', currentSyncToken: currentSyncToken }
        }})
      }

      response = await listConnections({
        personFields: 'names',
        resourceName: 'people/me',
        pageSize: 2,
    
        requestSyncToken: true,
        pageToken: nextPageToken,
        syncToken: ''
      })

    } finally {
  
      nextPageToken = response.data.nextPageToken || null
      syncToken     = response.data.nextSyncToken

      console.log('nextPageToken:', nextPageToken)
      console.log('syncToken:', syncToken)

      if(response.data.connections) {
        console.log('connections-length:', response.data.connections.length)
        connections = connections.concat(response.data.connections)
      } else {
        console.log('no response.data.connections', response.data)
      }
  
      counter ++
    }

  } while ( nextPageToken !== null )


  console.log('After do-whilte')
  console.log('connections:', connections.length)

  return { connections, syncToken }
}

Google.prototype.listContactGroups = async function(pageToken = null) {
  const auth  = this.oAuth2Client
  const people = google.people({ version: 'v1', auth })

  const listContactGroups = util.promisify(people.people.get)

  // response = { status, statusText, data }
  const response = await listContactGroups({
    resourceName: 'contactGroups',
    pageSize: 10,
  })
  
  console.log()
  console.log('------- List ContactGroups -------')
  console.log()
  console.log('ContactGroups:', prettyjson.render(response.data))
  console.log()

  return response.data
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

module.exports.setupClient = async function(gmail) {
  const gClient = new Google()

  gClient.config('api')

  gClient.setCredentials({
    'access_token': gmail.access_token,
    'refresh_token': gmail.refresh_token,
    'scope': gmail.scope,
    'expiry_date': new Date(gmail.expiry_date).getTime()
  })

  gClient.setGmailAddress(gmail.email)

  return gClient
}



// links
// https://developers.google.com/gmail/api/guides/sync
// https://stackoverflow.com/users/1841839/daimto