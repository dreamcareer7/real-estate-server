// @ts-nocheck
const Context      = require('../../Context')
const config       = require('../../../config')
const { google }   = require('googleapis')
const extractor    = require('./extract_json')
const createBody   = require('./gmail_body_maker')
const request      = require('request-promise-native')
const MailComposer = require('nodemailer/lib/mail-composer')

const CREDENTIALS  = config.google_integration.credential
const SCOPES       = config.google_scopes
const SUBSCRIPTION_TOPIC = config.google_integration.subscription.topic

function Google(){
  this.credentials   = CREDENTIALS
  this.client_secret = CREDENTIALS.client_secret
  this.client_id     = CREDENTIALS.client_id
}

Google.prototype.config = function (mode) {
  this.redirectTo = CREDENTIALS.redirect_to_uri

  if (mode === 'cli') {
    this.redirectTo = CREDENTIALS.redirect_to_uri_cli
  }

  this.oAuth2Client = new google.auth.OAuth2(this.client_id, this.client_secret, this.redirectTo)
}

Google.prototype.setGmailAddress = async function (gmailAddress) {
  this.gmailAddress = gmailAddress
}

Google.prototype.setCredentials = async function (tokens) {
  this.oAuth2Client.setCredentials(tokens)

  this.gmail    = google.gmail({ version: 'v1', auth: this.oAuth2Client })
  this.people   = google.people({ version: 'v1', auth: this.oAuth2Client })
  this.calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client })
}

Google.prototype.revokeCredentials = async function () {
  const result = await this.oAuth2Client.revokeCredentials()

  return result
}

Google.prototype.getAuthenticationLink = async function (state, scopes) {
  let scope = SCOPES.basic

  if (scopes.includes('contacts')) {
    scope = scope.concat(SCOPES.contacts.full)
  }

  if (scopes.includes('contacts.readonly')) {
    scope = scope.concat(SCOPES.contacts.readonly)
  }

  if (scopes.includes('contacts.other.readonly')) {
    scope = scope.concat(SCOPES.contacts.other.readonly)
  }

  if (scopes.includes('gmail.readonly')) {
    scope = scope.concat(SCOPES.gmail.readonly)
  }

  if (scopes.includes('gmail.send')) {
    scope = scope.concat(SCOPES.gmail.send)
    scope = scope.concat(SCOPES.gmail.modify)
  }

  if (scopes.includes('calendar')) {
    scope = scope.concat(SCOPES.calendar)
  }

  const authUrl = await this.oAuth2Client.generateAuthUrl({
    client_id: CREDENTIALS.client_id,
    access_type: 'offline',
    scope: scope,
    state: state,
    prompt: 'consent select_account',
    include_granted_scopes: true
    // login_hint: 'user-email-address'
  })

  return authUrl
}

Google.prototype.getAndSetTokens = async function (code) {
  const result = await this.oAuth2Client.getToken(code)
  await this.setCredentials(result.tokens)

  return result.tokens
}

Google.prototype.tokenInfo = async function (token) {
  const responseString = await request.get({ url: `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}` })

  return JSON.parse(responseString)
}

Google.prototype.refreshToken = async function (rToken) {
  const responseString = await request.post({
    url: 'https://oauth2.googleapis.com/token',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: {
      'grant_type': 'refresh_token',
      'refresh_token': rToken,
      'client_secret': CREDENTIALS.client_secret,
      'client_id': CREDENTIALS.client_id
    }
  })

  return JSON.parse(responseString)
}


// Profile
Google.prototype.getGmailProfile = async function () {
  const response = await this.gmail.users.getProfile({ auth: this.oAuth2Client, userId: 'me' })

  return response.data
}


// History
Google.prototype.discreteHistory = async function* (limit, currentHistoryId = null) {
  let nextPageToken = null
  let response

  do {
    try {

      response = await this.gmail.users.history.list({
        userId: 'me',
        maxResults: limit, // max: 500
        historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
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

Google.prototype.history = async function (currentHistoryId = null) {
  let history        = []
  let nextPageToken  = null
  let response

  do {

    response = await this.gmail.users.history.list({
      userId: 'me',
      maxResults: 250,
      historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
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


// Threads
Google.prototype.discreteSyncThreads = async function* () {
  let nextPageToken = null
  let response

  do {
    try {

      response = await this.gmail.users.threads.list({
        userId: 'me',
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

Google.prototype.syncThreads = async function () {
  let threads       = []
  let nextPageToken = null
  let response

  do {

    response = await this.gmail.users.threads.list({
      userId: 'me',
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

Google.prototype.getThread = async function (threadId) {
  const response = await this.gmail.users.threads.get({
    auth: this.oAuth2Client,
    userId: 'me',
    id: threadId,
    format: 'full' // metadata, minimal
  })

  return response.data
}

Google.prototype.searchThreads = async function (limit, query, next) {
  let nextPageToken = next || null

  const response = await this.gmail.users.threads.list({
    userId: 'me',
    includeSpamTrash: false,
    maxResults: limit,
    q: query,
    pageToken: nextPageToken
  })

  nextPageToken = response ? ( response.data ? response.data.nextPageToken : null ) : null

  if ( !response.data || !response.data.threads ) {
    return {
      threads: [],
      next: null
    }
  }

  return {
    threads: response.data.threads,
    next: nextPageToken || null
  }
}

Google.prototype.filterMessagesByQuery = async function* (query, limit) {
  let nextPageToken = null

  do {

    const response = await this.gmail.users.messages.list({
      userId: 'me',
      includeSpamTrash: true,
      maxResults: limit,
      q: query,
      pageToken: nextPageToken
    })

    nextPageToken = response ? response.data.nextPageToken : null

    yield response

  } while (nextPageToken)
}



// Messages
Google.prototype.discreteSyncMessages = async function* (limit) {
  // https://developers.google.com/gmail/api/v1/reference/quota
  // Sending batches larger than 50 requests is not recommended.

  let nextPageToken = null
  let response

  do {

    response = await this.gmail.users.messages.list({
      userId: 'me',
      includeSpamTrash: false,
      maxResults: limit, // max: 500
      pageToken: nextPageToken
    })

    nextPageToken = response ? response.data.nextPageToken : null

    yield response

  } while (nextPageToken)
}

Google.prototype.syncMessages = async function () {
  let messages      = []
  let nextPageToken = null
  let response

  do {

    response = await this.gmail.users.messages.list({
      userId: 'me',
      includeSpamTrash: false,
      maxResults: 50, // max: 500
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

Google.prototype.batchGetMessages = async function (messageIds, fields) {
  // https://developers.google.com/gmail/api/v1/reference/quota
  // Sending batches larger than 50 requests is not recommended.

  let messages = []

  const authHeader = await this.oAuth2Client.getRequestHeaders()

  do {
    const temp = messageIds.splice(0, 25)

    const multipart = temp.map(messageId => ({
      'Content-Type': 'application/http',
      'Content-ID': messageId,
      'body': `GET /gmail/v1/users/me/messages/${messageId}?format=full${fields} HTTP/1.1\n`
    }))
  
    const responseString = await request.post({
      url: 'https://www.googleapis.com/batch/gmail/v1',
      multipart: multipart,
      headers: {
        'Authorization': authHeader.Authorization,
        'content-type': 'multipart/mixed'
      }
    })

    const result = extractor.extractJSON(responseString)
    messages = messages.concat(result)

  } while ( messageIds.length > 0 )

  return messages
}

Google.prototype.getMessage = async function (messageId) {
  const response = await this.gmail.users.messages.get({
    auth: this.oAuth2Client,
    userId: 'me',
    id: messageId,
    format: 'full'
  })

  // decodeURI(escape(Buffer.from(input.replace(/\-/g, '+').replace(/\_/g, '/'), 'base64')))

  // message_raw = response['data']['payload']['parts'][0].body.data
  // message_raw = response.data.payload.parts[0].body.data

  // data = message_raw
  // buff = Buffer.from(data, 'base64')
  // text = buff.toString()

  // const data = 'V2l0aC1BdHRhY2htZW50LUJvZHkNCg0KDQpbaW1hZ2U6IGRyb3BlZC1pbmcuanBnXSA8aHR0cDovL2Ryb3BlZC1pbmcuanBnPg0K'
  // let buff = Buffer.from(data, 'base64')
  // let text = buff.toString('ascii')
  // const decoded = decodeURIComponent(escape(text))
  
  return response.data
}

Google.prototype.getAttachment = async function (messageId, attachmentId) {
  const response = await this.gmail.users.messages.attachments.get({
    auth: this.oAuth2Client,
    userId: 'me',
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

Google.prototype.searchMessage = async function (limit, query, next) {
  let nextPageToken = next || null

  const response = await this.gmail.users.messages.list({
    userId: 'me',
    includeSpamTrash: false,
    maxResults: limit,
    q: query,
    pageToken: nextPageToken
  })

  nextPageToken = response ? ( response.data ? response.data.nextPageToken : null ) : null

  if ( !response.data || !response.data.messages ) {
    return {
      messages: [],
      next: null
    }
  }

  return {
    messages: response.data.messages,
    next: nextPageToken || null
  }
}

Google.prototype.sendMessage = async function (email) {
  const message = [
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    'Content-Transfer-Encoding: 7bit',
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    '', // Extra new line required
    `${email.htmlBody}`
  ].join('\n')
  
  const raw = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const response = await this.gmail.users.messages.send({
    auth: this.oAuth2Client,
    userId: 'me',
    resource: {
      threadId: email.threadId,
      raw: raw
    }
  })

  return response
}

Google.prototype.sendMessageWithAttachment = async function (email) {
  // File Size Limit: 5 MB

  const message = new MailComposer({
    to: email.to,
    subject: email.subject,
    text: email.textBody,
    html: email.htmlBody,
    textEncoding: 'base64',
    attachments: email.attachments
  })

  const builtMessage = await message.compile().build()
  const raw          = Buffer.from(builtMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')    

  const response = await this.gmail.users.messages.send({
    auth: this.oAuth2Client,
    userId: 'me',
    uploadType: 'multipart',
    resource: {
      threadId: email.threadId,
      raw: raw
    }
  })

  return response
}

Google.prototype.sendMultipartMessage = async function (body) {
  // File Size Limit: Up To 35 MB
  const authHeader = await this.oAuth2Client.getRequestHeaders()
  
  const arr   = authHeader.Authorization.split('Bearer ')
  const token = arr[1]

  const responseString = await request.post({
    url: 'https://www.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=multipart',
    headers: {
      'Authorization': `OAuth ${token}`,
      'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
    },
    body: createBody(body)
  })

  return JSON.parse(responseString)
}

Google.prototype.batchModify = async function (messageIds, labelsToAdd, labelsToRemove) {
  const response = await this.gmail.users.messages.batchModify({
    auth: this.oAuth2Client,
    userId: 'me',
    requestBody: {
      ids: messageIds,
      addLabelIds: labelsToAdd,
      removeLabelIds: labelsToRemove
    }
  })

  return response.data
}

Google.prototype.modify = async function (messageId, labelsToAdd, labelsToRemove) {
  const response = await this.gmail.users.messages.modify({
    auth: this.oAuth2Client,
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: labelsToAdd,
      removeLabelIds: labelsToRemove
    }
  })

  return response.data
}

Google.prototype.updateReadStatus = async function(messageIds, status) {
  let labelsToAdd    = ['UNREAD']
  let labelsToRemove = []
  
  if (status) {
    labelsToAdd    = []
    labelsToRemove = ['UNREAD']
  }

  return this.batchModify(messageIds, labelsToAdd, labelsToRemove)
}

Google.prototype.moveToTrash = async function (messageId) {
  const result = await this.gmail.users.messages.trash({
    auth: this.oAuth2Client,
    userId: 'me',
    id: messageId
  })

  return result
}

Google.prototype.untrashMessage = async function (messageId) {
  const result = await this.gmail.users.messages.untrash({
    auth: this.oAuth2Client,
    userId: 'me',
    id: messageId
  })

  return result
}

Google.prototype.batchTrash = async function (messageIds) {
  const labelsToAdd    = ['TRASH']
  const labelsToRemove = []

  return this.batchModify(messageIds, labelsToAdd, labelsToRemove)
}

Google.prototype.batchArchive = async function (messageIds) {
  const labelsToAdd    = []
  const labelsToRemove = ['INBOX']

  return this.batchModify(messageIds, labelsToAdd, labelsToRemove)
}

Google.prototype.watchMailBox = async function () {
  await this.stopWatchMailBox()

  const result = await this.gmail.users.watch({
    auth: this.oAuth2Client,
    userId: 'me',
    resource: { topicName: SUBSCRIPTION_TOPIC }
  })

  /*
    Resource: https://developers.google.com/gmail/api/guides/push
    Setup: https://cloud.google.com/pubsub/docs/quickstart-console
    Dashboard: https://console.cloud.google.com/cloudpubsub/topic/list

    All changes after that historyId will be notified to your client.
    You must re-call watch() at least every 7 days.
    We recommend calling watch() once per day. The watch() response also has an expiration field with the timestamp for the watch expiration.
  */

  // { historyId: '24753', expiration: '1579959900549' }
  return result.data
}

Google.prototype.stopWatchMailBox = async function () {
  const result = await this.gmail.users.stop({
    auth: this.oAuth2Client,
    userId: 'me'
  })

  // result.status: 204
  return result.status
}


// Lables
Google.prototype.listLabels = async function () {
  const response = await this.gmail.users.labels.list({
    auth: this.oAuth2Client,
    userId: 'me'
  })

  return response.data.labels
}


Google.prototype.getProfileNative = async function () {
  const authHeader = await this.oAuth2Client.getRequestHeaders()
    
  const arr   = authHeader.Authorization.split('Bearer ')
  const token = arr[1]

  const response = await request.get({
    url: 'https://people.googleapis.com/v1/people/me?personFields=emailAddresses,names,photos',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  return JSON.parse(response)
}

// People, Contacts (pageSize: between 1 and 2000, inclusive. Defaults to 100)
Google.prototype.getProfile = async function () {
  const response = await this.people.people.get({
    resourceName: 'people/me',
    personFields: 'emailAddresses,names,photos',
  })

  return response.data
}

Google.prototype.listContactGroups = async function (currentSyncToken = null) {
  let contactGroups = []
  let nextSyncToken = currentSyncToken
  let nextPageToken
  let response
  let isSyncTokenRefreshed = false

  const currentGmailAddress = this.gmailAddress
  const expTokenMsg = 'Sync token is expired. Clear local cache and retry call without the sync token.'


  const body = {
    pageSize: 25
  }

  do {
    try {
      if (nextSyncToken && !isSyncTokenRefreshed) {
        body.syncToken = nextSyncToken
      } else if(isSyncTokenRefreshed) {
        body.syncToken = null
      }

      if (nextPageToken) {
        body.pageToken = nextPageToken
      }

      response = await this.people.contactGroups.list(body)

    } catch (ex) {
      if ( ex.message !== expTokenMsg ) {
        throw Error.Conflict({ details: {
          attributes: { email: currentGmailAddress },
          info: {
            method: 'google.listContactGroups',
            currentSyncToken: nextSyncToken,
            message: ex.message
          }
        }})
      }

      body.syncToken = null
      body.pageToken = null
      
      
      response = await this.people.contactGroups.list(body)
      isSyncTokenRefreshed = true
    } finally {
  
      nextPageToken = response.data.nextPageToken || null
      nextSyncToken = response.data.nextSyncToken
  
      if (response.data.contactGroups) {
        contactGroups = contactGroups.concat(response.data.contactGroups)
      }
    }

  } while ( nextPageToken !== null )

  return {
    contactGroups,
    nextSyncToken
  }
}

Google.prototype.listConnections = async function (currentSyncToken = null) {
  const currentGmailAddress = this.gmailAddress

  const requestSyncToken = true
  const pageSize     = 250
  const resourceName = 'people/me'
  const expTokenMsg  = 'Sync token is expired. Clear local cache and retry call without the sync token.'
  const personFields = 'metadata,clientData,memberships,addresses,phoneNumbers,photos,birthdays,emailAddresses,names,nicknames,organizations,occupations,urls,biographies'

  let connections    = []
  let syncToken      = currentSyncToken
  let nextPageToken
  let response

  do {

    try {

      response = await this.people.people.connections.list({
        personFields,
        resourceName,
        pageSize,
        requestSyncToken,
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
        personFields,
        resourceName,
        pageSize,
        requestSyncToken,
        pageToken: nextPageToken,
        syncToken: ''
      })

    } finally {
      if (!response?.data) { break } // eslint-disable-line no-unsafe-finally

      nextPageToken = response.data.nextPageToken || null
      syncToken     = response.data.nextSyncToken

      if (response.data.connections) {
        connections = connections.concat(response.data.connections)
      }
    }

  } while ( nextPageToken !== null )

  return {
    connections,
    syncToken
  }
}

Google.prototype.listOtherContacts = async function (currentSyncToken = null) {
  const currentGmailAddress = this.gmailAddress

  const requestSyncToken = true
  const pageSize = 250
  const readMask = 'metadata,emailAddresses,names,phoneNumbers'
  const expTokenMsg = 'Sync token is expired. Clear local cache and retry call without the sync token.'

  let otherContacts = []
  let syncToken     = currentSyncToken
  let nextPageToken = null
  let response

  do {

    try {

      response = await this.people.otherContacts.list({
        readMask,
        pageSize,
        requestSyncToken,
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

      response = await this.people.otherContacts.list({
        readMask,
        pageSize,
        requestSyncToken,
        pageToken: nextPageToken,
        syncToken: ''
      })

    } finally {
      if (!response?.data) { break } // eslint-disable-line no-unsafe-finally

      nextPageToken = response.data.nextPageToken || null
      syncToken     = response.data.nextSyncToken
  
      if (response.data.otherContacts) {
        otherContacts = otherContacts.concat(response.data.otherContacts)
      }
    }

  } while ( nextPageToken !== null )

  return {
    otherContacts,
    syncToken
  }
}

Google.prototype.createContact = async function () {
}

Google.prototype.batchInsertContacts = async function (contacts) {
  let counter   = 0
  let confirmed = []
  let error     = null

  const authHeader = await this.oAuth2Client.getRequestHeaders()

  try {
    do {
      const temp = contacts.splice(0, 25)

      const multipart = temp.map((contact, index) => ({
        'Content-Type': 'application/http',
        'Content-ID': (counter * 25) + index,
        'body': 'POST /v1/people:createContact HTTP/1.1\n'
              + 'Content-Type: application/json\n\n'
              + JSON.stringify(contact.resource)
      }))

      const responseString = await request.post({
        url: 'https://people.googleapis.com/batch',
        method: 'POST',
        multipart: multipart,
        headers: {
          'Authorization': authHeader.Authorization,
          'content-type': 'multipart/mixed'
        }
      })

      const result = extractor.extractJSON(responseString)
      confirmed = confirmed.concat(result)

      // Context.log('batchInsertContacts - remaining', contacts.length, ' - loop#', counter)
      // const failed        = result.filter(c => (c.error && c.error.code !== 404 && c.error.code !== 500 && c.error.code !== 429))
      // const notFound      = result.filter(c => (c.error && c.error.code === 404))
      // const QuotaExceeded = result.filter(c => (c.error && c.error.code === 429))
      // Context.log('batchInsertContacts', 'result:', result.length, 'failed:', failed.length, 'notFound:', notFound.length, 'QuotaExceeded:', QuotaExceeded.length)

      counter ++

      /*
        Critical write requests per minute per user = 180
        Each six consecutive iteration creates 150 write requests. so we need to wait at least 1 minute.
      */
      if ( counter % 6 === 0 ) {
        // Context.log('batchInsertContacts - waiting 65 seconds')
        await new Promise(r => setTimeout(r, 65000))
      }

    } while ( contacts.length > 0 )
  } catch (ex) {
    error = ex.message
    Context.log('batchInsertContacts-failed', ex.message)
  }

  return {
    confirmed,
    error
  }
}

Google.prototype.batchUpdateContacts = async function (contacts) {
  let counter   = 0
  let confirmed = []
  let error     = null

  const authHeader = await this.oAuth2Client.getRequestHeaders()

  try {
    do {
      const temp = contacts.splice(0, 25)

      const multipart = temp.map((contact, index) => ({
        'Content-Type': 'application/http',
        'Content-ID': (counter * 25) + index,
        'body': `PATCH /v1/people/${contact.resourceId}:updateContact?updatePersonFields=${contact.updatePersonFields} HTTP/1.1\n`
        + 'Content-Type: application/json\n\n'
        + JSON.stringify(contact.resource)
      }))
      
      const responseString = await request.post({
        url: 'https://people.googleapis.com/batch',
        method: 'POST',
        multipart: multipart,
        headers: {
          'Authorization': authHeader.Authorization,
          'content-type': 'multipart/mixed'
        }
      })
      
      const result = extractor.extractJSON(responseString)
      confirmed = confirmed.concat(result)

      // Context.log('batchUpdateContacts - remaining', contacts.length, ' - loop#', counter)
      // const failed        = result.filter(c => (c.error && c.error.code !== 404 && c.error.code !== 500 && c.error.code !== 429))
      // const notFound      = result.filter(c => (c.error && c.error.code === 404))
      // const QuotaExceeded = result.filter(c => (c.error && c.error.code === 429))
      // Context.log('batchUpdateContacts', 'result:', result.length, 'failed:', failed.length, 'notFound:', notFound.length, 'QuotaExceeded:', QuotaExceeded.length)

      counter ++

      /*
        Critical write requests per minute per user = 180
        Each six consecutive iteration creates 150 write requests. so we need to wait at least 1 minute.
      */
      if ( counter % 6 === 0 ) {
        // Context.log('batchUpdateContacts - waiting 65 seconds')
        await new Promise(r => setTimeout(r, 65000))
      }

    } while ( contacts.length > 0 )
  } catch (ex) {
    error = ex.message
    Context.log('batchUpdateContacts-failed', ex.message)
  }

  return {
    confirmed,
    error
  }
}

Google.prototype.batchDeleteContacts = async function (resourceIds) {
  let counter   = 0
  let confirmed = []
  let error     = null

  const authHeader = await this.oAuth2Client.getRequestHeaders()

  try {
    do {
      const temp = resourceIds.splice(0, 25)

      const multipart = temp.map((resourceId, index) => ({
        'Content-Type': 'application/http',
        'Content-ID': (counter * 25) + index,
        'body': `DELETE /v1/people/${resourceId}:deleteContact HTTP/1.1\n`
      }))

      const responseString = await request.post({
        url: 'https://people.googleapis.com/batch',
        method: 'POST',
        multipart: multipart,
        headers: {
          'Authorization': authHeader.Authorization,
          'content-type': 'multipart/mixed'
        }
      })

      const result = extractor.extractJSON(responseString)
      confirmed = confirmed.concat(result)

      counter ++

      /*
        Critical write requests per minute per user = 180
        Each six consecutive iteration creates 150 write requests. so we need to wait at least 1 minute.
      */
      if ( counter % 6 === 0 ) {
        // Context.log('batchDeleteContacts - waiting 65 seconds')
        await new Promise(r => setTimeout(r, 65000))
      }

    } while ( resourceIds.length > 0 )
  } catch (ex) {
    error = ex.message
    Context.log('batchDeleteContacts-failed', ex.message)
  }

  return {
    confirmed,
    error
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

  if (!data) {
    return []
  }

  if (!data.feed) {
    return []
  }

  if (data.feed.entry.length) {
    return data.feed.entry
  }

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


// Calendar
Google.prototype.listCalendars = async function () {
  const option = {
    maxResults: 100,
    minAccessRole: 'writer',
    pageToken: null,
    showHidden: true,
    showDeleted: false,
    syncToken: null
  }

  const calendarList = await this.calendar.calendarList.list(option)
  
  return calendarList.data
}

Google.prototype.createCalendar = async function (resource) {
  const result = await this.calendar.calendars.insert({ resource: resource })
  /*
    {
      kind: 'calendar#calendar',
      etag: '"tUbYNIo-tXTdSmtErt2XEdA9ULM"',
      id: 'fmtchvkhb14p00dri5pgq7hsdg@group.calendar.google.com',
      summary: 'summary',
      description: 'description',
      timeZone: 'UTC',
      conferenceProperties: { allowedConferenceSolutionTypes: [ 'eventHangout' ] }
    }
  */

  return result.data
}

Google.prototype.getCalendarList = async function (calendarId) {
  const result = await this.calendar.calendarList.get({ calendarId: calendarId })

  return result.data
}

Google.prototype.getCalendar = async function (calendarId) {
  try {
    const result = await this.calendar.calendars.get({ calendarId: calendarId })
    return result.data

  } catch (ex) {

    if (ex.code === 404)
      return null

    throw ex
  }
}

Google.prototype.updateCalendar = async function (calendarId, resource) {
  const result = await this.calendar.calendars.update({ calendarId: calendarId, resource: resource })

  return result.data
}

Google.prototype.deleteCalendar = async function (calendarId) {
  return await this.calendar.calendars.delete({ calendarId: calendarId })
}

Google.prototype.watchCalendar = async function (options) {
  const result = await this.calendar.events.watch(options)
  return result.data
}

Google.prototype.stopWatchCalendar = async function (options) {
  try {
    await this.calendar.channels.stop(options)
  } catch (ex) {
    // do nothing
    Context.log('Google stopWatchCalendar-Failed', ex)
  }
}


// Calendar Events
Google.prototype.listEvents = async function (calendarId) {
  const response = await this.calendar.events.list({
    calendarId: calendarId,
    singleEvents: true,
    maxResults: 10,
    showHiddenInvitations: true,
    showDeleted: true
  })

  return response.data.items
}

Google.prototype.syncEvents = async function (calendarId, timeMin, currentSyncToken = null) {
  let items         = []
  let nextSyncToken = currentSyncToken
  let nextPageToken = null
  let response

  do {
    // All events deleted since the previous list request will always be in the result set and it is not allowed to set showDeleted to False
    // If the syncToken expires, the server will respond with a 410 GONE response code and the client should clear its storage and perform a full synchronization without any syncToken.

    const options = {
      calendarId: calendarId,
      maxResults: 250,
      singleEvents: true,
      showHiddenInvitations: true,
      showDeleted: true,
      pageToken: nextPageToken
    }

    if (nextSyncToken)
      options.syncToken = nextSyncToken

    if (!options.syncToken)
      options.timeMin = timeMin

    try {
      response = await this.calendar.events.list(options)

    } catch (ex) {

      if ( ex.message === 'Sync token is no longer valid, a full sync is required.' ) {
        options.syncToken = null
        response = await this.calendar.events.list(options)
      } else {
        throw ex
      }
    }

    nextPageToken = response.data.nextPageToken || null
    nextSyncToken = response.data.nextSyncToken || null

    if (response.data.items) {
      items = items.concat(response.data.items)
    }

  } while ( nextPageToken !== null )

  return {
    items,
    nextSyncToken
  }
}

Google.prototype.createEvent = async function (calendarId, resource, sendUpdates = 'none') {
  // sendUpdates ==> all none false
  const result = await this.calendar.events.insert({ calendarId, resource, sendUpdates})

  /*
    resource = {
      summary: 'Google I/O 2015',
      start: {
        // date: 'yyyy-mm-dd' // if this is an all-day event
        dateTime: '2015-05-28T09:00:00-07:00',
        timeZone: 'America/Los_Angeles'
      },
      end: {
        // date: 'yyyy-mm-dd' // if this is an all-day event
        dateTime: '2015-05-28T17:00:00-07:00',
        timeZone: 'America/Los_Angeles'
      },

      location: '800 Howard St., San Francisco, CA 94103',
      description: 'A chance to hear more about Google\'s developer products.',

      attendees: [
        {email: 'lpage@example.com', displayName: 'name'},
        {email: 'sbrin@example.com', displayName: 'name'}
      ],
      reminders: {
        useDefault: false,
        overrides: [
          {method: 'email', minutes: 24 * 60}, // minutes => between 0 and 40320 (4 weeks in minutes)
          {method: 'popup', minutes: 10}
        ]
      },

      // How about outlook ???
      recurrence: [
        'RRULE:FREQ=DAILY;COUNT=2'
      ]
    }

    {
      kind: 'calendar#event',
      etag: '"3142350064046000"',
      id: 'vga26n3i1u3mt3a97k7p6almhk',
      status: 'confirmed',
      htmlLink: 'https://www.google.com/calendar/event?eid=dmdhMjZuM2kxdTNtdDNhOTdrN3A2YWxtaGtfMjAxOTEwMjBUMTYwMDAwWiBoZXNobWF0LnphcGF0YUBt',
      created: '2019-10-15T21:30:31.000Z',
      updated: '2019-10-15T21:30:32.068Z',
      summary: 'Google I/O 2015',
      description: "A chance to hear more about Google's developer products.",
      location: '800 Howard St., San Francisco, CA 94103',
      creator: { email: 'heshmat.zapata@gmail.com', self: true },
      organizer: { email: 'heshmat.zapata@gmail.com', self: true },
      start: {
        dateTime: '2019-10-20T12:00:00-04:00',
        timeZone: 'America/Los_Angeles'
      },
      end: {
        dateTime: '2019-10-20T14:00:00-04:00',
        timeZone: 'America/Los_Angeles'
      },
      recurrence: [ 'RRULE:FREQ=DAILY;COUNT=2' ],
      iCalUID: 'vga26n3i1u3mt3a97k7p6almhk@google.com',
      sequence: 0,
      reminders: { useDefault: false, overrides: [ [Object], [Object] ] }
    }
  */

  return result.data
}

Google.prototype.batchInsertEvent = async function (events) {
  let counter   = 0
  let confirmed = []
  let error     = null

  const authHeader = await this.oAuth2Client.getRequestHeaders()

  try {
    do {
      const temp = events.splice(0, 25)

      const multipart  = temp.map((event, index) => ({
        'Content-Type': 'application/http',
        'Content-ID': (counter * 25) + index,
        'body': `POST /calendar/v3/calendars/${event.calendarId}/events?sendUpdates=${event.sendUpdates || 'none'} HTTP/1.1\n`
              + 'Content-Type: application/json\n\n'
              + JSON.stringify(event.resource)
      }))

      const responseString = await request.post({
        url: 'https://www.googleapis.com/batch/calendar/v3',
        method: 'POST',
        multipart: multipart,
        headers: {
          'Authorization': authHeader.Authorization,
          'content-type': 'multipart/mixed'
        }
      })

      const result = extractor.extractJSON(responseString)
      confirmed = confirmed.concat(result)

      counter ++

    } while ( events.length > 0 )
  } catch (ex) {
    error = ex.message
    Context.log('batchInsertEvent-failed', ex.message)
  }

  return {
    confirmed,
    error
  }
}

Google.prototype.getEvent = async function (calendarId, eventId) {
  const result = await this.calendar.events.get({ calendarId: calendarId, eventId: eventId })

  return result.data
}

Google.prototype.getEventInstances = async function (calendarId, eventId, options) {
  let items         = []
  let nextSyncToken = options.currentSyncToken
  let nextPageToken = null
  let response

  do {

    response = await this.calendar.events.instances({
      calendarId: calendarId,
      eventId: eventId,
      maxResults: 100,
      showDeleted: true,

      timeMax: options.timeMax,
      timeMin: options.timeMin,

      pageToken: nextPageToken,
      syncToken: nextSyncToken
    })

    nextPageToken = response.data.nextPageToken || null
    nextSyncToken = response.data.nextSyncToken || null

    if (response.data.items)
      items = items.concat(response.data.items)

  } while ( nextPageToken !== null )

  return {
    items,
    nextSyncToken
  }
}

Google.prototype.updateEvent = async function (calendarId, eventId, resource, sendUpdates = 'none') {
  const result = await this.calendar.events.update({ calendarId, eventId, resource, sendUpdates})

  return result.data
}

Google.prototype.batchUpdateEvent = async function (events) {
  let counter   = 0
  let confirmed = []
  let error     = null

  const authHeader = await this.oAuth2Client.getRequestHeaders()

  try {
    do {
      const temp = events.splice(0, 25)

      const multipart = temp.map((event, index) => ({
        'Content-Type': 'application/http',
        'Content-ID': (counter * 25) + index,
        'body': `PUT /calendar/v3/calendars/${event.calendar.calendar_id}/events/${event.eventId}?sendUpdates=${event.sendUpdates || 'none'} HTTP/1.1\n`
              + 'Content-Type: application/json\n\n'
              + JSON.stringify(event.resource)
      }))

      const responseString = await request.post({
        url: 'https://www.googleapis.com/batch/calendar/v3',
        method: 'PUT',
        multipart: multipart,
        headers: {
          'Authorization': authHeader.Authorization,
          'content-type': 'multipart/mixed'
        }
      })

      const result = extractor.extractJSON(responseString)
      confirmed = confirmed.concat(result)

      counter ++

    } while ( events.length > 0 )
  } catch (ex) {
    error = ex.message
    Context.log('batchUpdateEvent-failed', ex.message)
  }

  return {
    confirmed,
    error
  }
}

Google.prototype.deleteEvent = async function (calendarId, eventId, sendUpdates = 'none') {
  return await this.calendar.events.delete({ calendarId, eventId, sendUpdates })
}

Google.prototype.batchDeleteEvents = async function (events) {
  let counter = 0
  let error   = null

  const authHeader = await this.oAuth2Client.getRequestHeaders()

  try {
    do {
      const temp = events.splice(0, 25)

      const multipart = temp.map((event, index) => ({
        'Content-Type': 'application/http',
        'Content-ID': (counter * 25) + index,
        'body': `DELETE /calendar/v3/calendars/${event.calendarId}/events/${event.eventId}?sendUpdates=${event.sendUpdates || 'none'} HTTP/1.1\n`
      }))
    
      await request.post({
        url: 'https://www.googleapis.com/batch/calendar/v3',
        method: 'PUT',
        multipart: multipart,
        headers: {
          'Authorization': authHeader.Authorization,
          'content-type': 'multipart/mixed'
        }
      })

      counter ++

    } while ( events.length > 0 )
  } catch (ex) {
    error = ex.message
    Context.log('batchDeleteEvents-failed', ex.message)
  }

  return {
    error
  }
}


// Clients
module.exports.cli = function () {
  const gClient = new Google()
  gClient.config('cli')

  return gClient
}

module.exports.api = function () {
  const gClient = new Google()
  gClient.config('api')

  return gClient
}

module.exports.setupClient = async function (credential) {
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
// https://stackoverflow.com/questions/39838354/is-push-notifications-google-api-service-available-for-google-contacts (Push notifications are not available for the Contacts API.)
