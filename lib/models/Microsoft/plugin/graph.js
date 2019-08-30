const config    = require('../../../config')
const MGraphCLI = require('@microsoft/microsoft-graph-client')
const request   = require('request-promise-native')

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

  if (scopes.includes('Mail.Send'))
    scope = scope.concat(SCOPES.mail.send)

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


MGraph.prototype.getProfileNative = async function() {
  const options = {
    method: 'GET',
    url: 'https://graph.microsoft.com/v1.0/me',
    headers: {
      'Postman-Token': 'c79400df-37cb-4f05-a4ec-f43ffa25b8c8',
      'cache-control': 'no-cache',
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

  const urls = [`https://graph.microsoft.com/v1.0/me/contacts?$top=100${filter}${select}`]

  for (const folder of folders) {
    urls.push(`https://graph.microsoft.com/v1.0/me/contactfolders/${folder}/contacts?$top=100${filter}${select}`)
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

  const select = projection.length ? projection.join(',') : ''

  const filter = lastSyncDate ? (`&$filter=lastModifiedDateTime ge ${new Date(lastSyncDate).toISOString()}`) : ''
  const urls   = [`/me/contacts?$top=100${filter}`]

  for (const folder of folders) {
    urls.push(`/me/contactfolders/${folder}/contacts?$top=100${filter}`)
  }

  let contacts = []

  for (let url of urls) {
    let next = null

    do {
      const res = await client.api(url).select(select).get()
      
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


MGraph.prototype.geMessagessNative = async function(query) {
  // `https://graph.microsoft.com/v1.0/me/mailFolders(\'Inbox\')/messages?$top=100${filter}`
  // `https://graph.microsoft.com/v1.0/me/mailFolders(\'SentItems\')/messages?$top=100${filter}`
  // https://graph.microsoft.com/v1.0/me/messages?$filter=from/emailAddress/address eq 'saeed.uni68@gmail.com'

  let url = `https://graph.microsoft.com/v1.0/me/messages?$top=100${query}`
  
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

MGraph.prototype.discreteGeMessagessNative = async function* (query) {
  let url  = `https://graph.microsoft.com/v1.0/me/messages?$top=10${query}`
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

  const requests = messageIds.map(message => ({
    'id': counter ++,
    'method': 'GET',
    'url': `/me/messages/${message}?&$select=bodyPreview,uniqueBody,body`
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

MGraph.prototype.sendMultipartMessage = async function(email) {
  // Send Large Attachments
  // https://stackoverflow.com/questions/54673731/send-mail-with-large-attachment

  const client = await this.getClient()

  return await client.api('/me/sendMail').post(email)
}


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