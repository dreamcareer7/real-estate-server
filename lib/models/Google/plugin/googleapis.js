// @ts-nocheck
const config    = require('../../../config')
const {google}  = require('googleapis')
const request   = require('request-promise-native')
const extractor = require('./extract_json')


const CREDENTIALS      = config.google_integration.credential
const SCOPES_READ_ONLY = config.google_scopes_read_only


function Google(){
  this.credentials   = CREDENTIALS
  this.client_secret = CREDENTIALS.client_secret
  this.client_id     = CREDENTIALS.client_id
}

Google.prototype.config = function(mode) {
  this.redirectTo = CREDENTIALS.redirect_to_uri

  if (mode === 'cli')
    this.redirectTo = CREDENTIALS.redirect_to_uri_cli

  this.oAuth2Client = new google.auth.OAuth2(this.client_id, this.client_secret, this.redirectTo)
}

Google.prototype.setGmailAddress = async function(gmailAddress) {
  this.gmailAddress = gmailAddress
}

Google.prototype.setCredentials = async function(tokens) {
  this.oAuth2Client.setCredentials(tokens)

  this.gmail  = google.gmail({ version: 'v1', auth: this.oAuth2Client })
  this.people = google.people({ version: 'v1', auth: this.oAuth2Client })
}

Google.prototype.revokeCredentials = async function() {
  const result = await this.oAuth2Client.revokeCredentials()

  return result
}

Google.prototype.getAuthenticationLink = async function(state, scopes) {
  /*
  scopes = [
    'contacts.readonly',
    'gmail.readonly'
  ]
  */

  let scope = SCOPES_READ_ONLY.contacts

  if (scopes.includes('gmail.readonly'))
    scope = SCOPES_READ_ONLY.contacts_and_messages

  const authUrl = await this.oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scope,
    state: state,
    prompt: 'select_account consent'
  })

  return authUrl
}

Google.prototype.getAndSetTokens = async function(code) {
  const result = await this.oAuth2Client.getToken(code)
  await this.setCredentials(result.tokens)

  return result.tokens
}


Google.prototype.getGmailProfile = async function() {
  const response = await this.gmail.users.getProfile({ auth: this.oAuth2Client, userId: 'me' })

  return response.data
}


Google.prototype.discreteHistory = async function* (currentHistoryId = null) {
  let nextPageToken = null
  let response

  do {
    try {

      response = await this.gmail.users.history.list({
        userId: this.gmailAddress,
        maxResults: 250, // max: 500
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
  let history        = []
  let nextPageToken  = null
  let response

  do {

    response = await this.gmail.users.history.list({
      userId: this.gmailAddress,
      maxResults: 250,
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


Google.prototype.discreteSyncThreads = async function* () {
  let nextPageToken = null
  let response

  do {
    try {

      response = await this.gmail.users.threads.list({
        userId: this.gmailAddress,
        includeSpamTrash: false,
        maxResults: 250, // max: 500
        pageToken: nextPageToken
      })

      nextPageToken = response ? response.data.nextPageToken : null

    } catch (ex) {
      response = ex.response
    }

    yield response

  } while (nextPageToken)
}

Google.prototype.syncThreads = async function() {
  let threads       = []
  let nextPageToken = null
  let response

  do {

    response = await this.gmail.users.threads.list({
      userId: this.gmailAddress,
      includeSpamTrash: false,
      maxResults: 250,
      pageToken: nextPageToken,
    })

    nextPageToken = response.data.nextPageToken || null

    if (response.data.threads)
      threads = threads.concat(response.data.threads)

  } while ( nextPageToken !== null )

  return {
    threads
  }
}

Google.prototype.getThread = async function(threadId) {
  const response = await this.gmail.users.threads.get({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    id: threadId,
    format: 'full' // metadata, minimal
  })

  return response.data
}


Google.prototype.discreteSyncMessages = async function* () {
  let nextPageToken = null
  let response

  do {

    response = await this.gmail.users.messages.list({
      userId: this.gmailAddress,
      includeSpamTrash: false,
      maxResults: 250, // max: 500
      pageToken: nextPageToken
    })

    nextPageToken = response ? response.data.nextPageToken : null

    yield response

  } while (nextPageToken)
}

Google.prototype.syncMessages = async function() {
  let messages      = []
  let nextPageToken = null
  let response

  do {

    response = await this.gmail.users.messages.list({
      userId: this.gmailAddress,
      includeSpamTrash: false,
      maxResults: 250, // max: 500
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

Google.prototype.batchGetMessages = async function(messages, fields) {
  const authHeader = await this.oAuth2Client.getRequestHeaders()
  const multipart  = messages.map(message => ({
    'Content-Type': 'application/http',
    'Content-ID': message.id,
    'body': `GET gmail/v1/users/me/messages/${message.id}?format=full${fields} HTTP/1.1\n`
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
  const response = await this.gmail.users.messages.get({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    id: messageId,
    format: 'full'
  })

  // decodeURI(escape(Buffer.from(input.replace(/\-/g, '+').replace(/\_/g, '/'), 'base64')))

  // message_raw = response['data']['payload']['parts'][0].body.data
  // message_raw = response.data.payload.parts[0].body.data

  // data = message_raw;  
  // buff = new Buffer(data, 'base64');  
  // text = buff.toString();
  // console.log(text);


  // const data = "V2l0aC1BdHRhY2htZW50LUJvZHkNCg0KDQpbaW1hZ2U6IGRyb3BlZC1pbmcuanBnXSA8aHR0cDovL2Ryb3BlZC1pbmcuanBnPg0K"
  // let buff = new Buffer(data, 'base64');
  // let text = buff.toString('ascii');
  // console.log( decodeURIComponent(escape(text)) )
  

  return response.data
}

Google.prototype.getAttachment = async function (messageId, attachmentId) {
  // GET https://www.googleapis.com/gmail/v1/users/userId/messages/messageId/attachments/id

  const response = await this.gmail.users.messages.attachments.get({
    auth: this.oAuth2Client,
    userId: this.gmailAddress,
    id: attachmentId,
    messageId: messageId
  })

  /*
    {
      "attachmentId": string,
      "size": integer,
      "data": bytes
    }
  */

  return response.data
}



// LAbles
Google.prototype.listLabels = async function() {
  const response = await this.gmail.users.labels.list({
    auth: this.oAuth2Client,
    userId: this.gmailAddress
  })

  return response.data
}


// People, Contacts (pageSize: between 1 and 2000, inclusive. Defaults to 100)
Google.prototype.getProfile = async function() {
  const response = await this.people.people.get({
    resourceName: 'people/me',
    personFields: 'emailAddresses,names,photos',
  })

  return response.data
}

Google.prototype.listConnections = async function(currentSyncToken = null) {
  const currentGmailAddress = this.gmailAddress

  const expTokenMsg  = 'Sync token is expired. Clear local cache and retry call without the sync token.'
  const personFields = 'metadata,addresses,birthdays,coverPhotos,emailAddresses,names,nicknames,organizations,phoneNumbers,photos,urls,memberships'

  let connections    = []
  let syncToken      = currentSyncToken
  let nextPageToken
  let response

  do {

    try {

      response = await this.people.people.connections.list({
        personFields: personFields,
        resourceName: 'people/me',
        pageSize: 250,
        requestSyncToken: true,
        pageToken: nextPageToken,
        syncToken: syncToken
      })

    } catch (ex) {

      if ( ex.message !== expTokenMsg ) {
        throw Error.Conflict({ details: {
          attributes: { email: currentGmailAddress },
          info: { method: 'google.listConnections', currentSyncToken: currentSyncToken }
        }})
      }

      response = await this.people.people.connections.list({
        personFields: personFields,
        resourceName: 'people/me',
        pageSize: 250,
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
  let contactGroups = []
  let syncToken     = currentSyncToken
  let pageToken
  let response
  let body

  do {

    body = {
      resourceName: 'contactGroups',
      pageSize: 250
    }
    
    if (pageToken)
      body.pageToken = pageToken

    if (syncToken && !pageToken)
      body.syncToken = syncToken

    response = await this.people.people.get(body)

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


// conatacts api v3
Google.prototype.getContactGroups = async function () {
  const authHeader = await this.oAuth2Client.getRequestHeaders()
  
  const arr   = authHeader.Authorization.split('Bearer ')
  const token = arr[1]

  const responseString = await request.get({
    url: 'https://www.google.com/m8/feeds/groups/default/full?alt=json&showdeleted=false',
    headers: {
      'Authorization': `OAuth ${token}`,
      'GData-Version': 3
    }
  })

  const data = JSON.parse(responseString)

  if (!data)
    return []

  if (!data.feed)
    return []

  if (data.feed.entry.length)
    return data.feed.entry

  return []
}

Google.prototype.getContacts = async function (path) {
  const authHeader = await this.oAuth2Client.getRequestHeaders()
  
  const arr   = authHeader.Authorization.split('Bearer ')
  const token = arr[1]

  let url      = `https://www.google.com${path}`
  let contacts = []
  let next     = false

  do {
    const responseString = await request.get({
      url: url,
      headers: {
        'Authorization': `OAuth ${token}`,
        'GData-Version': 3
      }
    })

    const data = JSON.parse(responseString)
    
    contacts = contacts.concat(data.feed.entry)
    next     = false

    for (const link of data.feed.link) {
      if ( link.rel === 'next' ) {
        next = true
        url  = link.href
      }
    }

  } while ( next )

  return contacts
}

Google.prototype.getContactPhoto = async function (url) {
  const authHeader = await this.oAuth2Client.getRequestHeaders()

  const arr   = authHeader.Authorization.split('Bearer ')
  const token = arr[1]

  const imagedata = await request.get({
    url: url,
    encoding: 'binary',
    headers: {
      'Authorization': `OAuth ${token}`,
      'GData-Version': 3
    }
  })

  // const fs = require('fs').promises
  // await fs.writeFile(`/home/saeed/Desktop/${new Date().getTime()}.jpg`, imagedata, 'binary')

  return imagedata
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