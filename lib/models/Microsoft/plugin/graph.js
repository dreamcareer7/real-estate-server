// @ts-nocheck
const config    = require('../../../config')
const MGraphCLI = require('@microsoft/microsoft-graph-client')
const request   = require('request-promise-native')



const CREDENTIALS      = config.microsoft_credential
const SCOPES_FULL      = config.microsoft_scopes_full
const SCOPES_READ_ONLY = config.microsoft_scopes_read_only


function MGraph(){
  this.credentials   = CREDENTIALS
  this.client_id     = CREDENTIALS.client_id
  this.client_secret = CREDENTIALS.client_secret
  this.auth_uri      = CREDENTIALS.auth_uri
  this.redirect_uri  = config.microsoft.credential_redirect_uri

  this.response_type = 'code'
  this.response_mode = 'query'
  this.prompt        = 'login'
}

MGraph.prototype.config = function(readOnly = true) {
  this.scope = SCOPES_READ_ONLY.contacts

  if (!readOnly)
    this.scope = SCOPES_FULL
}

MGraph.prototype.setTokens = function(tokens) {
  this.tokens = tokens

  return this.tokens
}

MGraph.prototype.setMicrosoftEmailAddress = async function(email) {
  this.email = email
}

MGraph.prototype.getAuthenticationLink = async function(state) {
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

MGraph.prototype.revokeCredentials = async function() {
}

MGraph.prototype.tokenRequest = async function(code) {
  const options = {
    method: 'POST',
    url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded'
    },
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
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded'
    },
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


MGraph.prototype.getPeopleNative = async function() {
  let url     = 'https://graph.microsoft.com/v1.0/me/people?$top=100'
  let people  = []
  let next    = null

  do {
    const responseString = await request.get({
      url: url,
      headers: {
        Authorization: `Bearer ${this.tokens.access_token}`
      }
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
      headers: {
        Authorization: `Bearer ${this.tokens.access_token}`
      }
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

MGraph.prototype.getContactsNative = async function(lastSyncDate, folders) {
  const filter = lastSyncDate ? (`&$filter=createdDateTime ge ${new Date(lastSyncDate).toISOString()}`) : ''

  const urls = [`https://graph.microsoft.com/v1.0/me/contacts?$top=1${filter}`]

  for (const folder of folders) {
    urls.push(`https://graph.microsoft.com/v1.0/me/contactfolders/${folder}/contacts?$top=100${filter}`)
  }

  let contacts = []

  for (let url of urls) {
    let next = null
  
    do {
      const responseString = await request.get({
        url: url,
        headers: {
          Authorization: `Bearer ${this.tokens.access_token}`
        }
      })
  
      const data = JSON.parse(responseString)
      
      contacts = contacts.concat(data.value)
      next     = data['@odata.nextLink'] || null
      url      = next
  
    } while ( next )  
  }

  return contacts
}

MGraph.prototype.getContacts = async function(lastSyncDate, folders) {
  const client = await this.getClient()

  const filter = lastSyncDate ? (`&$filter=createdDateTime ge ${new Date(lastSyncDate).toISOString()}`) : ''

  const urls = [`/me/contacts?$top=1${filter}`]

  for (const folder of folders) {
    urls.push(`/me/contactfolders/${folder}/contacts?$top=100${filter}`)
  }

  let contacts = []

  for (let url of urls) {
    let next = null

    do {
      const res = await client.api(url).get()
      
      contacts = contacts.concat(res.value)
      next     = res['@odata.nextLink'] || null
      url      = next

    } while ( next )  
  }

  return contacts
}


MGraph.prototype.getContactPhoto = async function (url) {
  // GET /me/photo/$value
  // GET /me/contacts/{id}/photo/$value
  // GET /me/contactfolders/{contactFolderId}/contacts/{id}/photo/$value

  const imagedata = await request.get({
    url: 'https://graph.microsoft.com/v1.0/me/photo/$value',
    encoding: 'binary',
    headers: {
      Authorization: `Bearer ${this.tokens.access_token}`
    }
  })

  // const fs = require('fs').promises
  // await fs.writeFile(`/home/saeed/Desktop/${new Date().getTime()}.jpg`, imagedata, 'binary')

  return imagedata
}




module.exports.api = function(readOnly) {
  const mClient = new MGraph()
  mClient.config(readOnly)

  return mClient
}

module.exports.setupClient = async function(credential) {
  const mClient = new MGraph()

  mClient.config()

  mClient.setTokens({
    'access_token': credential.access_token,
    'refresh_token': credential.refresh_token,
    'id_token': credential.id_token,
    'scope': credential.scope.join(' ')
  })

  mClient.setMicrosoftEmailAddress(credential.email)

  return mClient
}