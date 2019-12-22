require("isomorphic-fetch");

const config    = require('../../../config')
const MGraphCLI = require('@microsoft/microsoft-graph-client')
const request   = require('request-promise-native')
const Context   = require('../../Context')

const CREDENTIALS = config.microsoft_integration.credential
const SCOPES      = config.microsoft_scopes


function MGraph(){
  this.credentials   = CREDENTIALS
  this.client_id     = CREDENTIALS.client_id
  this.client_secret = CREDENTIALS.client_secret
  this.auth_uri      = CREDENTIALS.auth_uri
  this.redirect_uri  = CREDENTIALS.redirect_to_uri

  this.response_type = 'code'
  this.response_mode = 'query'
  this.prompt        = 'login'
}

MGraph.prototype.setTokens = function(tokens) {
  this.tokens = tokens

  return this.tokens
}

MGraph.prototype.setMicrosoftEmailAddress = async function(email) {
  this.email = email
}

MGraph.prototype.getAuthenticationLink = async function(state, scopes) {
  let scope = SCOPES.basic

  if (scopes.includes('Contacts.Read'))
    scope = scope.concat(SCOPES.contacts.read)

  if (scopes.includes('Mail.Read'))
    scope = scope.concat(SCOPES.mail.read)

  if (scopes.includes('Mail.Send')) {
    scope = scope.concat(SCOPES.mail.send)
    scope = scope.concat(SCOPES.mail.draft)
  }

  this.scope = scope

  const authUrl = `${this.auth_uri}`
    + `client_id=${this.client_id}`
    + `&redirect_uri=${this.redirect_uri}`
    + `&response_type=${this.response_type}`
    + `&response_mode=${this.response_mode}`
    + `&scope=${this.scope.join(' ')}`
    + `&state=${state}`
    + `&prompt=${this.prompt}`

  return encodeURI(authUrl)
}

MGraph.prototype.tokenRequest = async function(code) {
  const options = {
    method: 'POST',
    url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    form: {
      client_id: this.client_id,
      client_secret: this.client_secret,
      scope: this.scope,
      redirect_uri: this.redirect_uri,
      grant_type: 'authorization_code',
      code: code
    }
  }

  const responseString = await request.post(options)

  return this.setTokens(JSON.parse(responseString))
}

MGraph.prototype.refreshToken = async function() {
  const options = {
    method: 'POST',
    url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    form: {
      client_id: this.client_id,
      client_secret: this.client_secret,
      scope: this.scope,
      redirect_uri: this.redirect_uri,
      grant_type: 'refresh_token',
      refresh_token: this.tokens.refresh_token
    }
  }
  
  const responseString = await request.post(options)

  return this.setTokens(JSON.parse(responseString))
}

MGraph.prototype.getClient = async function() {
  const client = MGraphCLI.Client.init({
    defaultVersion: 'v1.0',
    debugLogging: false,
    authProvider: (done) => {
      done(null, this.tokens.access_token)
    },
  })

  return client
}


// Profile
MGraph.prototype.getProfileNative = async function() {
  const options = {
    method: 'GET',
    url: 'https://graph.microsoft.com/v1.0/me',
    headers: {
      Authorization: `Bearer ${this.tokens.access_token}`
    }
  }

  const responseString = await request.get(options)

  return JSON.parse(responseString)
}

MGraph.prototype.getProfile = async function() {
  const client = await this.getClient()
  const res    = await await client.api('/me').get()

  return res
}

MGraph.prototype.getProfileAvatar = async function () {
  try {
    const imageInfo = await request.get({
      url: 'https://graph.microsoft.com/beta/me/photo',
      encoding: 'binary',
      headers: { Authorization: `Bearer ${this.tokens.access_token}` }
    })
    
    const imageData = await request.get({
      url: 'https://graph.microsoft.com/beta/me/photo/$value',
      encoding: 'binary',
      headers: { Authorization: `Bearer ${this.tokens.access_token}` }
    })

    return {
      imageInfo,
      imageData
    }

  } catch (ex) {

    return {
      imageInfo: null,
      imageData: null
    }
  }
}


// People
MGraph.prototype.getPeopleNative = async function() {
  let url     = 'https://graph.microsoft.com/v1.0/me/people?$top=100'
  let people  = []
  let next    = null

  do {
    const responseString = await request.get({
      url: url,
      headers: { Authorization: `Bearer ${this.tokens.access_token}` }
    })

    const data = JSON.parse(responseString)
    
    people = people.concat(data.value)
    next    = data['@odata.nextLink'] || null
    url     = next

  } while ( next )

  return people
}

MGraph.prototype.getPeople = async function() {
  const client = await this.getClient()

  let url    = '/me/people?$top=100'
  let people = []
  let next   = null

  do {
    const res = await client.api(url).get()

    people = people.concat(res.value)
    next   = res['@odata.nextLink'] || null
    url    = next

  } while ( next )

  return people
}


// Contact
MGraph.prototype.getContactFoldersNative = async function() {
  let url     = 'https://graph.microsoft.com/v1.0/me/contactFolders?$top=100'
  let folders = []
  let next    = null

  do {
    const responseString = await request.get({
      url: url,
      headers: { Authorization: `Bearer ${this.tokens.access_token}` }
    })

    const data = JSON.parse(responseString)
    
    folders = folders.concat(data.value)
    next    = data['@odata.nextLink'] || null
    url     = next

  } while ( next )

  return folders
}

MGraph.prototype.getContactFolders = async function() {
  const client = await this.getClient()

  let url     = '/me/contactFolders?$top=100'
  let folders = []
  let next    = null

  do {
    const res = await client.api(url).get()

    folders = folders.concat(res.value)
    next    = res['@odata.nextLink'] || null
    url     = next

  } while ( next )

  return folders
}

MGraph.prototype.getContactsNative = async function(lastSyncDate, folders, projection) {
  const filter = lastSyncDate ? (`&$filter=lastModifiedDateTime ge ${new Date(lastSyncDate).toISOString()}`) : ''
  const select = projection.length ? (`&$select=${projection.join(',')}`) : ''

  const urls = [`https://graph.microsoft.com/v1.0/me/contacts?$top=25${filter}${select}`]

  for (const folder of folders) {
    urls.push(`https://graph.microsoft.com/v1.0/me/contactfolders/${folder}/contacts?$top=25${filter}${select}`)
  }

  let contacts = []

  for (let url of urls) {
    let next = null
  
    do {
      const responseString = await request.get({
        url: url,
        headers: { Authorization: `Bearer ${this.tokens.access_token}` }
      })
  
      const data = JSON.parse(responseString)
      
      contacts = contacts.concat(data.value)
      next     = data['@odata.nextLink'] || null
      url      = next
  
    } while ( next )  
  }

  return contacts
}

MGraph.prototype.getContacts = async function(lastSyncDate, folders, projection) {
  const client = await this.getClient()

  // $top gt 25 will result in throw an exception by microsoft-graph

  const select = projection.length ? projection.join(',') : ''
  const filter = lastSyncDate ? (`&$filter=lastModifiedDateTime ge ${new Date(lastSyncDate).toISOString()}`) : ''
  const urls   = [`/me/contacts?$top=25${filter}`]

  for (const folder of folders) {
    urls.push(`/me/contactfolders/${folder}/contacts?$top=25${filter}`)
  }

  let loopCounter = 1
  let contacts    = []

  for (let url of urls) {
    let next = null

    do {

      let res

      if ( loopCounter++ > 1 ) {
        res = await client.api(url).get()
      } else {
        res = await client.api(url).select(select).get()
      }

      contacts = contacts.concat(res.value)
      next     = res['@odata.nextLink'] || null
      url      = next

    } while ( next )  
  }

  return contacts
}

MGraph.prototype.getContactPhoto = async function (contactId) {
  try {
    const imageInfo = await request.get({
      url: `https://graph.microsoft.com/v1.0/me/contacts/${contactId}/photo`,
      encoding: 'binary',
      headers: { Authorization: `Bearer ${this.tokens.access_token}` }
    })
    
    const imageData = await request.get({
      url: `https://graph.microsoft.com/v1.0/me/contacts/${contactId}/photo/$value`,
      encoding: 'binary',
      headers: { Authorization: `Bearer ${this.tokens.access_token}` }
    })

    return {
      imageInfo,
      imageData
    }

  } catch (ex) {

    return {
      imageInfo: null,
      imageData: null
    }
  }
}


// Message
MGraph.prototype.geMessagesNative = async function(query) {
  // `https://graph.microsoft.com/v1.0/me/mailFolders(\'Inbox\')/messages?$top=50${filter}`
  // `https://graph.microsoft.com/v1.0/me/mailFolders(\'SentItems\')/messages?$top=50${filter}`
  // https://graph.microsoft.com/v1.0/me/messages?$filter=from/emailAddress/address eq 'saeed.uni68@gmail.com'

  let url = `https://graph.microsoft.com/v1.0/me/messages?$top=200${query}`
  
  let messages = []
  let next     = null

  do {
    const responseString = await request.get({
      url: url,
      headers: { Authorization: `Bearer ${this.tokens.access_token}` }
    })

    const data = JSON.parse(responseString)

    messages = messages.concat(data.value)
    next     = data['@odata.nextLink'] || null
    url      = next

  } while ( next )

  return messages
}

MGraph.prototype.geMessagesByUrl = async function(url) {
  const responseString = await request.get({
    url: url,
    headers: { Authorization: `Bearer ${this.tokens.access_token}` }
  })

  const data = JSON.parse(responseString)

  return data.value
}

MGraph.prototype.discreteGetMessagessNative = async function* (url) {
  let next = null

  do {
    const responseString = await request.get({
      url: url,
      headers: { Authorization: `Bearer ${this.tokens.access_token}` }
    })

    const data = JSON.parse(responseString)

    next = data['@odata.nextLink'] || null
    url  = next

    yield data

  } while (next)
}

MGraph.prototype.batchGetMessagesNative = async function (messageIds) {
  let counter = 1

  const expand = '&$expand=attachments($select=id,name,contentType,size,isInline)'

  const requests = messageIds.map(message => ({
    'id': counter ++,
    'method': 'GET',
    'url': `/me/messages/${message}?&$select=bodyPreview,uniqueBody,body,isRead${expand}`
  }))

  const options = {
    method: 'POST',
    url: 'https://graph.microsoft.com/v1.0/$batch',
    json: true,
    headers: {
      'Authorization': `Bearer ${this.tokens.access_token}`
      // 'Prefer': 'outlook.body-content-type="text"'
    },
    body: {
      requests: requests
    }
  }
  
  return await request.post(options)
}

MGraph.prototype.getAttachment = async function (messageId, attachmentId) {
  const client = await this.getClient()

  /*
    {
      "@odata.type": "#microsoft.graph.fileAttachment",
      "contentType": "contentType-value",
      "contentLocation": "contentLocation-value",
      "contentBytes": "binary",
      "contentId": "null",
      "lastModifiedDateTime": "2016-01-01T12:00:00Z",
      "id": "id-value",
      "isInline": false,
      "name": "name-value",
      "size": 99
    }
  */

  return await client.api(`/me/messages/${messageId}/attachments/${attachmentId}`).get()
}

MGraph.prototype.getAttachmentNative = async function (messageId, attachmentId) {
  const options = {
    method: 'GET',
    url: `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments/${attachmentId}`,
    headers: { 
      Authorization: `Bearer ${this.tokens.access_token}`
    }
  }

  const responseString = await request.get(options)

  return JSON.parse(responseString)
}

MGraph.prototype.sendMultipartMessage = async function(email) {
  // Send Large Attachments
  // https://stackoverflow.com/questions/54673731/send-mail-with-large-attachment

  const client = await this.getClient()

  return await client.api('/me/sendMail').post(email)
}

MGraph.prototype.createMessage = async function(email) {
  const client = await this.getClient()

  return await client.api('/me/messages').post(email.message)
}

MGraph.prototype.createReply = async function(messageId) {
  // The internetMessageHeaders collection will only accept "custom headers".
  // In order to reply to a message, you need to use the /createReply endpoint and then update this message to add additional content/attachments before you send it
  // https://stackoverflow.com/questions/55945615/cannot-pass-in-reply-to-parameter-to-microsoft-graph-sendmail

  const client = await this.getClient()

  return await client.api(`/me/messages/${messageId}/createReply`).post({})
}

MGraph.prototype.deleteDraft = async function(messageId) {
  const client = await this.getClient()

  return await client.api(`/me/messages/${messageId}`).delete()
}

MGraph.prototype.updateMessage = async function(messageId, message) {
  const client = await this.getClient()

  return await client.api(`/me/messages/${messageId}`).update(message)
}

MGraph.prototype.updateMessageNative = async function(messageId, message) {
  const options = {
    method: 'POST',
    url: `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
    json: true,
    headers: {
      'Authorization': `Bearer ${this.tokens.access_token}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(message)
  }
  
  const responseString = await request.post(options)

  Context.log('debug-sendEmail updateMessageNative', responseString)

  return JSON.parse(responseString)
}

MGraph.prototype.updateMessageExtensionsNative = async function(messageId, data) {
  const options = {
    method: 'POST',
    url: `https://graph.microsoft.com/v1.0/me/messages/${messageId}/extensions`,
    json: true,
    headers: {
      'Authorization': `Bearer ${this.tokens.access_token}`,
      'Content-Type': 'application/json' 
    },
    body: data
  }
  
  const responseString = await request.post(options)

  Context.log('debug-sendEmail updateMessageExtensionsNative', responseString)

  return JSON.parse(responseString)
}

MGraph.prototype.markAsRead = async function(messageId) {
  return this.updateMessage(messageId, { isRead: true })
}

MGraph.prototype.markAsUnRead = async function(messageId) {
  return this.updateMessage(messageId, { isRead: false })
}

MGraph.prototype.addAttachment = async function(messageId, attachment) {
  const client = await this.getClient()

  return await client.api(`/me/messages/${messageId}/attachments`).post(attachment)
}

MGraph.prototype.addAttachmentNative = async function(messageId, attachment) {
  const options = {
    method: 'POST',
    url: `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments`,
    headers: { 
      Authorization: `Bearer ${this.tokens.access_token}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(attachment)
  }

  const responseString = await request.post(options)

  return JSON.parse(responseString)
}

MGraph.prototype.sendMessage = async function(messageId) {
  const client = await this.getClient()

  return await client.api(`/me/messages/${messageId}/send`).post({})
}

MGraph.prototype.searchThreads = async function (limit, query, page) {
  const base   = 'https://graph.microsoft.com/v1.0/me/messages?$search='
  const select = '&$select=id,conversationId'
  const top    = `&$top=${limit}`

  let next = null
  let url  = `${base}${query}${select}${top}`
  let pageCounter = 1

  do {
    const responseString = await request.get({
      url: url,
      headers: { Authorization: `Bearer ${this.tokens.access_token}` }
    })

    const data = JSON.parse(responseString)

    pageCounter ++
    next = data['@odata.nextLink'] || null
    url  = next

    if ( data.value.length === 0 )
      return []

    if ( !next || pageCounter === page )
      return data.value

  } while (next)
}


// Subscription
MGraph.prototype.subscription = async function(messageId) {
  const client = await this.getClient()

  // https://docs.microsoft.com/en-us/graph/webhooks
  // https://docs.microsoft.com/en-us/graph/api/resources/subscription?view=graph-rest-1.0

  /*
    Expire Date: less than 3 days

    Check this later (important): https://docs.microsoft.com/en-us/graph/webhooks-outlook-authz

    changeType: created, updated, deleted
    resource: Contacts => me/contacts , Calendars => me/events
  */

  const subscription = {
    changeType: 'created,updated',
    notificationUrl: 'https://webhook.azurewebsites.net/api/send/myNotifyClient',
    resource: 'me/mailFolders(\'Inbox\')/messages',
    expirationDateTime: '2016-11-20T18:23:45.9356913Z',
    clientState: 'secretClientValue'
  }
 
  return await client.api('/subscriptions').post(subscription)

  /*
    Response: {
      "@odata.context": "https://graph.microsoft.com/beta/$metadata#subscriptions/$entity",
      "id": "7f105c7d-2dc5-4530-97cd-4e7ae6534c07",
      "resource": "me/messages", // me/mailFolders('Inbox')/messages
      "applicationId": "24d3b144-21ae-4080-943f-7067b395b913",
      "changeType": "created,updated",
      "clientState": "secretClientValue",
      "notificationUrl": "https://webhook.azurewebsites.net/api/send/myNotifyClient",
      "expirationDateTime": "2016-11-20T18:23:45.9356913Z",
      "creatorId": "8ee44408-0679-472c-bc2a-692812af3437"
    }


    Notification: {
      "value": [
        {
          "subscriptionId":"<subscription_guid>",
          "subscriptionExpirationDateTime":"2016-03-19T22:11:09.952Z",
          "clientState":"secretClientValue",
          "changeType":"created",
          "resource":"users/{user_guid}@<tenant_guid>/messages/{long_id_string}",
          "resourceData":
          {
            "@odata.type":"#Microsoft.Graph.Message",
            "@odata.id":"Users/{user_guid}@<tenant_guid>/Messages/{long_id_string}",
            "@odata.etag":"W/\"CQAAABYAAADkrWGo7bouTKlsgTZMr9KwAAAUWRHf\"",
            "id":"<long_id_string>"
          }
        }
      ]
    }
  */
}

module.exports.MGraph = MGraph

module.exports.api = function(scopes) {
  const mClient = new MGraph()

  return mClient
}

module.exports.setupClient = async function(credential) {
  const mClient = new MGraph()

  mClient.setTokens({
    'access_token': credential.access_token,
    'refresh_token': credential.refresh_token,
    'id_token': credential.id_token,
    'scope': credential.scope.join(' ')
  })

  mClient.setMicrosoftEmailAddress(credential.email)

  return mClient
}
