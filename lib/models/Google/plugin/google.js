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
  // 'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.readonly'
  // 'https://www.googleapis.com/auth/contacts.readonly'
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

  console.log('new token', newTokens.access_token)
  console.log('new expire', newTokens.expiry_date)

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
    maxResults: 2,
    includeSpamTrash: false,
    pageToken: pageToken
  })

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
Google.prototype.listConnections = async function(pageToken = null) {
  const auth  = this.oAuth2Client
  const people = google.people({ version: 'v1', auth })

  const listConnections = util.promisify(people.people.connections.list)

  // response = { status, statusText, data }
  const response = await listConnections({
    personFields: 'names,emailAddresses',
    resourceName: 'people/me',
    pageSize: 2,
  })
  
  console.log()
  console.log('------- List Connections -------')
  console.log('Connections:', prettyjson.render(response.data))

  return response.data
}

Google.prototype.listContactGroups = async function(pageToken = null) {
  const auth  = this.oAuth2Client
  const people = google.people({ version: 'v1', auth })

  const listContactGroups = util.promisify(people.people.get)

  // response = { status, statusText, data }
  const response = await listContactGroups({
    resourceName: 'contactGroups',
    pageSize: 2,
  })
  
  console.log()
  console.log('------- List ContactGroups -------')
  console.log('ContactGroups:', prettyjson.render(response.data))

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