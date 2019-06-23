// @ts-nocheck
const config    = require('../../../config')
const {google}  = require('googleapis')
const request   = require('request-promise-native')
const extractor = require('./extract_json')



const CREDENTIALS = config.google_credential
const SCOPES      = config.google_scopes


function Google(){
  this.credentials   = CREDENTIALS
  this.client_secret = CREDENTIALS.installed.client_secret
  this.client_id     = CREDENTIALS.installed.client_id
  this.scope         = SCOPES
}

Google.prototype.config = function(mode) {
  this.redirectTo = config.google.credential_redirect_uri

  if (mode === 'cli')
    this.redirectTo = CREDENTIALS.installed.redirect_uris[0]

  this.setupOAuth2Client()
}

Google.prototype.setupOAuth2Client = function() {
  this.oAuth2Client = new google.auth.OAuth2(this.client_id, this.client_secret, this.redirectTo)
}

Google.prototype.setGmailAddress = async function(gmailAddress) {
  this.gmailAddress = gmailAddress
}

Google.prototype.setCredentials = async function(tokens) {
  this.oAuth2Client.setCredentials(tokens)
}

Google.prototype.revokeCredentials = async function() {
  const result = await this.oAuth2Client.revokeCredentials()

  return result
}

Google.prototype.getAuthenticationLink = async function(state) {
  const authUrl = await this.oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: state,
    prompt: 'consent'
    // include_granted_scopes: true
  })

  return authUrl
}

Google.prototype.getAndSetTokens = async function(code) {
  const result = await this.oAuth2Client.getToken(code)
  await this.setCredentials(result.tokens)

  return result.tokens
}


// Profile required scope: https://www.googleapis.com/auth/gmail.readonly
Google.prototype.getGmailProfile = async function() {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const response = await gmail.users.getProfile({ auth: this.oAuth2Client, userId: 'me' })

  return response.data
}


// History required scope: https://www.googleapis.com/auth/gmail.readonly
Google.prototype.discreteHistory = async function* (currentHistoryId = null) {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  let nextPageToken = null
  let response

  do {
    try {

      response = await gmail.users.history.list({
        userId: this.gmailAddress,
        maxResults: 1000, // max: 500
        historyTypes: ['messageAdded', 'messageDeleted'],
        startHistoryId: currentHistoryId,
        pageToken: nextPageToken
      })

      nextPageToken = response ? response.data.nextPageToken : null

    } catch (ex) {
      response = ex.response
    }

    yield response

  } while (nextPageToken)
}

Google.prototype.history = async function(currentHistoryId = null) {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  let history        = []
  let nextPageToken  = null
  let response

  do {

    response = await gmail.users.history.list({
      userId: this.gmailAddress,
      maxResults: 2,
      historyTypes: ['messageAdded', 'messageDeleted'],
      startHistoryId: currentHistoryId,
      pageToken: nextPageToken
    })

    if (response) {      
      nextPageToken = response.data.nextPageToken || null

      if (response.data.history)
        history = history.concat(response.data.history)
    }

  } while ( nextPageToken !== null )

  return history
}


// Threads required scope: https://www.googleapis.com/auth/gmail.readonly
Google.prototype.discreteSyncThreads = async function* () {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  let nextPageToken = null
  let response

  do {
    try {

      response = await gmail.users.threads.list({
        userId: this.gmailAddress,
        includeSpamTrash: false,
        maxResults: 10, // max: 500
        pageToken: nextPageToken
      })

      // nextPageToken = response.data.threads ? response.data.nextPageToken : null
      nextPageToken = response ? response.data.nextPageToken : null

    } catch (ex) {
      response = ex.response
    }

    yield response

  } while (nextPageToken)
}

Google.prototype.syncThreads = async function() {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  let threads       = []
  let nextPageToken = null
  let response

  do {

    response = await gmail.users.threads.list({
      userId: this.gmailAddress,
      includeSpamTrash: false,
      maxResults: 10, // max: 500
      pageToken: nextPageToken,
    })

    nextPageToken = response.data.nextPageToken || null
    // const resultSizeEstimate = response.data.resultSizeEstimate || null

    if (response.data.threads)
      threads = threads.concat(response.data.threads)

  } while ( nextPageToken !== null )

  return {
    threads
  }
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

  return response.data
}


// Messages required scope: https://www.googleapis.com/auth/gmail.readonly
Google.prototype.discreteSyncMessages = async function* () {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  let nextPageToken = null
  let response

  do {
    try {

      response = await gmail.users.messages.list({
        userId: this.gmailAddress,
        includeSpamTrash: false,
        maxResults: 2, // max: 500
        pageToken: nextPageToken
      })

      // nextPageToken = response.data.messages ? response.data.nextPageToken : null
      nextPageToken = response ? response.data.nextPageToken : null

    } catch (ex) {
      response = ex.response
    }

    yield response

  } while (nextPageToken)
}

Google.prototype.syncMessages = async function() {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  let messages      = []
  let nextPageToken = null
  let response

  do {

    response = await gmail.users.messages.list({
      userId: this.gmailAddress,
      includeSpamTrash: false,
      maxResults: 10, // max: 500
      pageToken: nextPageToken
    })

    if(response.data.messages) {
      nextPageToken = response.data.nextPageToken || null
      messages      = messages.concat(response.data.messages)

    } else {
      
      nextPageToken = null
    }

  } while ( nextPageToken !== null )

  return {
    messages
  }
}

Google.prototype.batchGetMessages = async function(messages) {
  const authHeader = await this.oAuth2Client.getRequestHeaders()
  const multipart  = messages.map(message => ({
    'Content-Type': 'application/http',
    'Content-ID': message.id,
    'body': `GET gmail/v1/users/me/messages/${message.id} HTTP/1.1\n`
  }))

  const responseString = await request.post({
    url: 'https://www.googleapis.com/batch/gmail/v1',
    multipart: multipart,
    headers: {
      'Authorization': authHeader.Authorization,
      'content-type': 'multipart/mixed'
    }
  })

  return extractor.extract(responseString)
}

Google.prototype.getMessage = async function(messageId) {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const response = await gmail.users.messages.get({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    id: messageId
  })

  // Decode body: decodeURIComponent(escape(b64Decode(string.replace(/\-/g, '+').replace(/\_/g, '/'))))

  return response.data
}


// LAbles
Google.prototype.listLabels = async function() {
  const auth  = this.oAuth2Client
  const gmail = google.gmail({ version: 'v1', auth })

  const response = await gmail.users.labels.list({
    auth: this.oAuth2Client,
    userId: this.gmailAddress
  })

  return response.data
}


// People, Contacts (pageSize: between 1 and 2000, inclusive. Defaults to 100)
Google.prototype.getProfile = async function() {
  const auth   = this.oAuth2Client
  const people = google.people({ version: 'v1', auth })

  const response = await people.people.get({
    resourceName: 'people/me',
    personFields: 'emailAddresses,names,photos',
  })

  return response.data
}

Google.prototype.listConnections = async function(currentSyncToken = null) {
  const currentGmailAddress = this.gmailAddress
  const auth   = this.oAuth2Client
  const people = google.people({ version: 'v1', auth })

  const expTokenMsg  = 'Sync token is expired. Clear local cache and retry call without the sync token.'
  const personFields = 'metadata,addresses,birthdays,coverPhotos,emailAddresses,names,nicknames,organizations,phoneNumbers,photos,urls,memberships'

  let connections    = []
  let syncToken      = currentSyncToken
  let nextPageToken
  let response

  do {

    try {

      response = await people.people.connections.list({
        personFields: personFields,
        resourceName: 'people/me',
        pageSize: 100,
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
        pageSize: 100,
        requestSyncToken: true,
        pageToken: nextPageToken,
        syncToken: ''
      })

    } finally {
  
      nextPageToken = response.data.nextPageToken || null
      syncToken     = response.data.nextSyncToken

      if (response.data.connections)
        connections = connections.concat(response.data.connections)
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

  let contactGroups = []
  let syncToken     = currentSyncToken
  let pageToken
  let response
  let body

  do {

    body = {
      resourceName: 'contactGroups',
      pageSize: 100
    }
    
    if (pageToken)
      body.pageToken = pageToken

    if (syncToken && !pageToken)
      body.syncToken = syncToken

    response = await people.people.get(body)

    pageToken = response.data.nextPageToken || null
    syncToken = response.data.nextSyncToken

    if (response.data.contactGroups)
      contactGroups = contactGroups.concat(response.data.contactGroups)

  } while ( pageToken !== null )

  return {
    contactGroups,
    syncToken
  }
}


// Clients
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
    'expiry_date': credential.expiry_date // 3600 (1 hour)
  })

  gClient.setGmailAddress(credential.email)

  return gClient
}


// links
// https://developers.google.com/gmail/api/guides/sync
// https://stackoverflow.com/users/1841839/daimto
// https://developers.google.com/gmail/api/guides/sync