require('isomorphic-fetch')
const _ = require('lodash')

const request   = require('request-promise-native')
const MGraphCLI = require('@microsoft/microsoft-graph-client')
const Context   = require('../../Context')
const config    = require('../../../config')
const Metric    = require('../../Metric')

const CREDENTIALS = config.microsoft_integration.credential
const SCOPES      = config.microsoft_scopes
const CONTACT_EXT = config.microsoft_integration.openExtension.contact.name


/** @typedef {import('../contact/defs.d.ts').Microsoft.Contact} MicrosoftContact */
/** @typedef {any} RequestResult */
/** @typedef {{ confirmed: RequestResult[] }} Confirmed */
/** @typedef {{ failed: RequestResult[] }} Failed */

/** 
 * Returns a promise that resolves after `ms` millis.
 * @param {number} ms
 * @returns {Promise}
 */
const sleep = ms => new Promise(r => setTimeout(r, ms))

/**
 * Returns the `items` if all of elements already has got `requestId`.
 * Otherwise returns an array w/ same elements and assign a `requestId`
 * to each element.
 * @template T
 * @param {T[]} items
 * @returns {(T & { requestId: string })[]}
 */
const ensureRequestIds = items => {
  return items.every(item => item.requestId)
    ? items
    : items.map((item, index) => ({ ...item, requestId: String(index) }))
}

/**
 * Returns specific URI path to access a contact
 * @param {object} $0
 * @param {string} $0.id
 * @param {string=} [$0.parentFolderId]
 * @param {object} $1 - Options
 * @param {boolean} [$1.withExtensions=false] - Expand extensions, too?
 * @returns {string}
 */
const contactUri = ({ id, parentFolderId = null }, { withExtensions = false } = {} ) => {
  let uri = parentFolderId
    ? `/me/contactFolders/${parentFolderId}/contacts/${id}`
    : `/me/contacts/${id}`

  if (withExtensions) {
    uri += `?$expand=extensions($filter=id eq '${CONTACT_EXT}')`
  }

  return uri
}

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

  if (scopes.includes('Contacts.Read')) {
    scope = scope.concat(SCOPES.contacts.read)
  }

  if (scopes.includes('Contacts')) {
    scope = scope.concat(SCOPES.contacts.full)
  }

  if (scopes.includes('Mail.Read')) {
    scope = scope.concat(SCOPES.mail.read)
  }

  if (scopes.includes('Mail.Send')) {
    scope = scope.concat(SCOPES.mail.send)
    scope = scope.concat(SCOPES.mail.draft)
  }

  if (scopes.includes('Calendars.ReadWrite')) {
    scope = scope.concat(SCOPES.calendar)
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
    },
    timeout: 30000
  }

  try {
    const responseString = await request.post(options)
    Metric.increment('microsoft.token.auth')
    return this.setTokens(JSON.parse(responseString))
  } catch (ex) {
    Metric.increment('microsoft.token.auth.error', [`status:${ex.statusCode}`])
    throw ex
  }
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
    },
    timeout: 30000
  }
  
  try {
    const responseString = await request.post(options)
    Metric.increment('microsoft.token.refresh')
    return this.setTokens(JSON.parse(responseString))
  } catch (ex) {
    Metric.increment('microsoft.token.refresh.error', [`status:${ex.statusCode}`])
    throw ex
  }
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

// Delta
MGraph.prototype.delta = async function (url, timeZone = 'UTC') {
  let values = []
  let delta  = null
  let next   = null

  const options = {
    method: 'GET',
    url,
    headers: {
      'Authorization': `Bearer ${this.tokens.access_token}`,
      'Content-Type': 'application/json',
      'Prefer': `outlook.timezone="${timeZone}"`
    },
    timeout: 30000
  }

  do {
    const response = await request.get(options)
    const result   = JSON.parse(response)

    delta = result['@odata.deltaLink']
    next  = result['@odata.nextLink']
    options.url = next

    if (result.value.length) {
      values = values.concat(result.value)
    }

  } while (next)

  return {
    delta,
    values
  }
}

// Delta With ImmutableId
MGraph.prototype.deltaWithImmutableId = async function (url, timeZone = 'UTC') {
  let values = []
  let delta  = null
  let next   = null

  const options = {
    method: 'GET',
    url,
    headers: {
      'Authorization': `Bearer ${this.tokens.access_token}`,
      'Content-Type': 'application/json',
      'Prefer': `outlook.timezone="${timeZone}",IdType="ImmutableId"`
    },
    timeout: 30000
  }

  do {
    const response = await request.get(options)
    const result   = JSON.parse(response)

    delta = result['@odata.deltaLink']
    next  = result['@odata.nextLink']
    options.url = next

    if (result.value.length) {
      values = values.concat(result.value)
    }

  } while (next)

  return {
    delta,
    values
  }
}

// Batch
MGraph.prototype.batchRequest = async function(body) {
  const payload = [...body.requests]

  if ( payload.length === 0 ) {
    return { responses: [] }
  }

  let result
  let responses = []

  const options = {
    method: 'POST',
    url: 'https://graph.microsoft.com/v1.0/$batch',
    json: true,
    headers: {
      'Authorization': `Bearer ${this.tokens.access_token}`,
      'Content-Type': 'application/json' 
    }
  }

  do {
    options.body = { requests: payload.splice(0,20) }

    try {
      result    = await request.post(options)
      Metric.increment('microsoft.batch')
      responses = responses.concat(result.responses)
    } catch (ex) {
      Metric.increment('microsoft.batch.error')
      throw ex
    }

    // console.log('batchRequest responses', responses)
    // console.log('batchRequest responses body', responses[0].body)
    // if (responses[0].body) console.log('batchRequest responses body error', responses[0].body.error)

  } while ( payload.length > 0 )

  return {
    responses
  }
}

// Batch Request With ImmutableId
MGraph.prototype.batchRequestWithImmutableId = async function(body) {
  const payload = [...body.requests]

  if ( payload.length === 0 ) {
    return { responses: [] }
  }

  let result
  let responses = []

  const options = {
    method: 'POST',
    url: 'https://graph.microsoft.com/v1.0/$batch',
    json: true,
    headers: {
      'Authorization': `Bearer ${this.tokens.access_token}`,
      'Content-Type': 'application/json',
      'Prefer': 'IdType="ImmutableId"'
    }
  }

  do {
    options.body = { requests: payload.splice(0,20) }

    try {
      result    = await request.post(options)
      Metric.increment('microsoft.batch')
      responses = responses.concat(result.responses)
    } catch (ex) {
      Metric.increment('microsoft.batch.error')
      throw ex
    }

    // console.log('batchRequest responses', responses)
    // console.log('batchRequest responses body', responses[0].body)
    // if (responses[0].body) console.log('batchRequest responses body error', responses[0].body.error)

  } while ( payload.length > 0 )

  return {
    responses
  }
}

// Profile
MGraph.prototype.getProfileNative = async function() {
  const options = {
    method: 'GET',
    url: 'https://graph.microsoft.com/v1.0/me',
    headers: {
      Authorization: `Bearer ${this.tokens.access_token}`
    },
    timeout: 30000
  }

  try {
    const responseString = await request.get(options)
    Metric.increment('microsoft.api.me')
    return JSON.parse(responseString)
  } catch (ex) {
    Metric.increment('microsoft.api.me.error', [ `status:${ex.statusCode}` ])
    throw ex
  }
}

MGraph.prototype.getProfile = async function() {
  const client = await this.getClient()
  try {
    const response = await client.api('/me').get()
    Metric.increment('microsoft.api.me')
    return response
  } catch (ex) {
    Metric.increment('microsoft.api.me.error', [ `status:${ex.statusCode}` ])
    throw ex
  }
}

MGraph.prototype.getProfileAvatar = async function () {
  try {
    const imageInfo = await request.get({
      url: 'https://graph.microsoft.com/beta/me/photo',
      encoding: 'binary',
      headers: { Authorization: `Bearer ${this.tokens.access_token}` },
      timeout: 90000
    })

    Metric.increment('microsoft.api.me.photo')
    
    const imageData = await request.get({
      url: 'https://graph.microsoft.com/beta/me/photo/$value',
      encoding: 'binary',
      headers: { Authorization: `Bearer ${this.tokens.access_token}` },
      timeout: 90000
    })

    Metric.increment('microsoft.api.me.photo.download')

    return {
      imageInfo,
      imageData
    }

  } catch (ex) {
    Metric.increment('microsoft.api.me.photo.error')

    return {
      imageInfo: null,
      imageData: null
    }
  }
}


// People
/**
 * Creates some contacts in bulk using Microsoft batch API
 * @param {{ resource: MicrosoftContact, requestId?: string? }[]} chunks
 * @returns {Confirmed & Failed}
 */
MGraph.prototype.batchInsertContacts = async function (chunks) {
  chunks = ensureRequestIds(chunks)
  
  const bodyBuilder = contacts => contacts.map(contact => ({
    id: contact.requestId,
    method: 'POST',
    url: '/me/contacts',
    body: contact.resource,
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'IdType="ImmutableId"'
    }
  }))

  const confirmed = []
  const failed = []
  
  for (let chunk = chunks;;) {
    const requests = bodyBuilder(chunk)
    const { responses } = await this.batchRequestWithImmutableId({ requests })
    Metric.increment('microsoft.batch.contacts.insert')

    const toRetry = []

    _(responses)
      .reject(r => r.status === 200 && confirmed.push(r))
      .reject(r => r.status === 201 && confirmed.push(r))
      .reject(r => r.status === 429 && toRetry.push(String(r.id)))
      .forEach(r => failed.push(r))

    if (!toRetry.length) { break }
    
    const retryAfter = _(responses)
      .filter({ status: 429 })
      .map('headers.Retry-After')
      .map(Number)
      .filter(Boolean)
      .max()

    retryAfter && await sleep(retryAfter * 1000)
    chunk = chunks.filter(ch => toRetry.includes(ch.requestId))
  }

  return {
    confirmed,
    failed
  }
}

/**
 * Updates contacts in bulk, using Microsoft batch API
 * @param {{ resource: MicrosoftContact, id: UUID, parentFolderId?: UUID?, requestId?: string? }[]} chunks
 * @returns {Confirmed & Failed}
 */
MGraph.prototype.batchUpdateContacts = async function (chunks) {
  chunks = ensureRequestIds(chunks)
  
  let retryAfterArr = []
  let confirmed     = []
  let toRetry       = []
  let failed        = []

  let retryAfter = 0
  let chunk      = chunks
  
  const bodyBuilder = function(contacts) {
    const requests = contacts.map(contact => {
      return {
        'id': contact.requestId,
        'method': 'PATCH',
        'url': contactUri(contact),
        'body': contact.resource,
        'headers': {
          'Content-Type': 'application/json',
          Prefer: 'IdType="ImmutableId"' 
        }
      }
    })

    return requests
  }

  do {

    const requests = bodyBuilder(chunk)
    const result   = await this.batchRequestWithImmutableId({ requests })
    Metric.increment('microsoft.batch.contacts.update')
  
    confirmed = confirmed.concat(result.responses.filter(record => ( record.status === 200 || record.status === 201 )))
    failed    = failed.concat(result.responses.filter(record => ( record.status !== 200 && record.status !== 201 && record.status !== 429 )))
    toRetry   = result.responses.filter(record => ( record.status === 429 )).map(record => record.id)

    if (toRetry.length) {
      retryAfterArr = result.responses.filter(record => ( record.status === 429 )).map(record => record.headers['Retry-After'])
      retryAfter    = Math.max(...retryAfterArr)

      if (retryAfter) {
        await sleep(retryAfter * 1000)
      }

      chunk = chunks.filter(record => { if (toRetry.includes(record.requestId) || toRetry.includes(String(record.requestId))) return record })
    }

  } while ( toRetry.length !== 0 )

  return {
    confirmed,
    failed
  }
}

/**
 * Fetches contacts in bulk, using Microsoft batch API
 * @param {{ parentFolderId?: string?, id: string, requestId?: string? }[]} chunks
 * @param {object} $1 - options
 * @param {boolean} [$1.withExtensions=false] - Expand extensions, too?
 * @returns {Confirmed & Failed}
 */
MGraph.prototype.batchGetContacts = async function (
  chunks,
  { withExtensions = false } = {}
) {
  /**
   * Converts the request `item` to a valid request object
   * @param {{ parentFolderId?: string?, id: string, requestId?: string? }} item
   * @returns {object}
   */
  const toRequestBody = item => ({
    id: item.requestId,
    method: 'GET',
    url: contactUri(item),
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'IdType="ImmutableId"'
    },
  })

  chunks = ensureRequestIds(chunks)
  
  let retryAfterArr = []
  let confirmed     = []
  let toRetry       = []
  let failed        = []

  let retryAfter = 0
  let chunk      = chunks

  do {
    const requests = chunk.map(toRequestBody)
    const result = await this.batchRequestWithImmutableId({ requests })
    Metric.increment('microsoft.batch.contacts.get')
  
    confirmed = confirmed.concat(result.responses.filter(record => ( record.status === 200 || record.status === 201 )))
    failed    = failed.concat(result.responses.filter(record => ( record.status !== 200 && record.status !== 201 && record.status !== 429 )))
    toRetry   = result.responses.filter(record => ( record.status === 429 )).map(record => record.id)

    if (toRetry.length) {
      retryAfterArr = result.responses.filter(record => ( record.status === 429 )).map(record => record.headers['Retry-After'])
      retryAfter    = Math.max(...retryAfterArr)

      if (retryAfter) {
        await sleep(retryAfter * 1000)
      }

      chunk = chunks.filter(record => { if (toRetry.includes(record.id) || toRetry.includes(String(record.id))) return record })
    }

  } while ( toRetry.length !== 0 )

  return { confirmed, failed }
}

/**
 * Deletes contacts in bulk, using Microsoft batch API
 * @param {{ id: UUID, parentFolderId?: UUID?, requestId?: string? }} chunks
 * @returns {Failed}
 */
MGraph.prototype.batchDeleteContacts = async function (chunks) {
  chunks = ensureRequestIds(chunks)

  let retryAfterArr = []
  let toRetry = []
  let failed  = []

  let retryAfter = 0
  let chunk      = chunks

  const bodyBuilder = function(contacts) {
    const requests = contacts.map(contact => {
      return {
        'id': contact.requestId,
        'method': 'DELETE',
        'url': contactUri(contact),
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'IdType="ImmutableId"' 
        },
      }
    })

    return requests
  }
  
  do {

    const requests = bodyBuilder(chunk)
    const result   = await this.batchRequestWithImmutableId({ requests })
    Metric.increment('microsoft.batch.contacts.delete')

    failed  = failed.concat(result.responses.filter(record => ( record.status !== 200 && record.status !== 201 && record.status !== 204 && record.status !== 429 )))
    toRetry = result.responses.filter(record => ( record.status === 429 )).map(record => record.id)

    if (toRetry.length) {
      retryAfterArr = result.responses.filter(record => ( record.status === 429 )).map(record => record.headers['Retry-After'])
      retryAfter    = Math.max(...retryAfterArr)
  
      if (retryAfter) {
        await sleep(retryAfter * 1000)
      }

      chunk = chunks.filter(record => { if (toRetry.includes(record.requestId) || toRetry.includes(String(record.requestId))) return record })
    }

  } while ( toRetry.length !== 0 )

  return {
    failed
  }
}


MGraph.prototype.getPeopleNative = async function() {
  let url     = 'https://graph.microsoft.com/v1.0/me/people?$top=100'
  let people  = []
  let next    = null

  do {
    const responseString = await request.get({
      url: url,
      headers: {
        Authorization: `Bearer ${this.tokens.access_token}`,
        Prefer: 'IdType="ImmutableId"'
      },
      timeout: 30000
    })
    Metric.increment('microsoft.api.people')

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
    const res = await client.api(url).header('Prefer', 'IdType="ImmutableId"').get()
    Metric.increment('microsoft.api.people')

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
        Authorization: `Bearer ${this.tokens.access_token}`,
        Prefer: 'IdType="ImmutableId"'
      },
      timeout: 30000
    })
    Metric.increment('microsoft.api.contacts.folders')

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
    const res = await client.api(url).header('Prefer', 'IdType="ImmutableId"').get()
    Metric.increment('microsoft.api.contacts.folders')

    folders = folders.concat(res.value)
    next    = res['@odata.nextLink'] || null
    url     = next

  } while ( next )

  return folders
}

MGraph.prototype.syncContactFolders = async function(token) {
  const url = token || 'https://graph.microsoft.com/v1.0/me/contactFolders/delta'

  const { values, delta } = await this.deltaWithImmutableId(url)
  Metric.increment('microsoft.delta.contacts.folders')

  return {
    values,
    delta
  }
}

/** 
 * @typedef {{folder_id: string?, delta: string}} FolderSyncToken
 * @param {Object[]} folders
 * @param {string[]} projection
 * @returns {Promise<{contacts: any[], syncTokens: FolderSyncToken[]}>}
 */
MGraph.prototype.syncContacts = async function(folders, projection) {
  /** @type {FolderSyncToken[]} */
  const syncTokens = []
  const base = 'https://graph.microsoft.com/v1.0/me'

  let contacts = []

  // url ==> folder path
  for (const folder of folders) {
    const url = folder.folder_id
      ? ( folder.sync_token ? folder.sync_token : `${base}/contactfolders/${folder.folder_id}/contacts/delta?$select=${projection}`)
      : ( folder.sync_token ? folder.sync_token : `${base}/contacts/delta?$select=${projection}`)
    
    const { values, delta } = await this.deltaWithImmutableId(url)
    Metric.increment('microsoft.delta.contacts')

    contacts = contacts.concat(values)
    syncTokens.push({ folder_id: folder.folder_id, delta })
  }

  return {
    contacts,
    syncTokens
  }
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
        headers: {
          Authorization: `Bearer ${this.tokens.access_token}`,
          Prefer: 'IdType="ImmutableId"'
        },
        timeout: 30000
      })
      Metric.increment('microsoft.api.contacts')

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
        res = await client.api(url).header('Prefer', 'IdType="ImmutableId"').get()
      } else {
        res = await client.api(url).header('Prefer', 'IdType="ImmutableId"').select(select).get()
      }
      Metric.increment('microsoft.api.contacts')

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
      headers: {
        Authorization: `Bearer ${this.tokens.access_token}`,
        Prefer: 'IdType="ImmutableId"'
      },
      timeout: 90000
    })
    Metric.increment('microsoft.api.contact.photo')
    
    const imageData = await request.get({
      url: `https://graph.microsoft.com/v1.0/me/contacts/${contactId}/photo/$value`,
      encoding: 'binary',
      headers: {
        Authorization: `Bearer ${this.tokens.access_token}`,
        Prefer: 'IdType="ImmutableId"'
      },
      timeout: 90000
    })
    Metric.increment('microsoft.api.contact.photo.download')

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


// Labels
MGraph.prototype.getFolders = async function(version) {
  const headers = { Authorization: `Bearer ${this.tokens.access_token}` }
  const url     = `https://graph.microsoft.com/${version}/me/mailFolders?$top=250`
  const options = { url, headers, timeout: 30000 }

  let error   = null
  let folders = []

  try {
    const response = await request.get(options)
    Metric.increment('microsoft.api.mail.folders')
    const data = JSON.parse(response)
    folders = data.value
  } catch (ex) {
    Metric.increment('microsoft.api.mail.folders.error')
    error = ex
  }

  return {
    folders,
    error
  }
}

MGraph.prototype.listFolders = async function() {
  const vBeta = await this.getFolders('beta')
  const vOne  = await this.getFolders('v1.0')

  return {
    vBeta,
    vOne
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
      headers: { 
        Authorization: `Bearer ${this.tokens.access_token}`,
        Prefer: 'IdType="ImmutableId"',
      },
      timeout: 30000
    })
    Metric.increment('microsoft.api.messages')

    const data = JSON.parse(responseString)

    messages = messages.concat(data.value)
    next     = data['@odata.nextLink'] || null
    url      = next

  } while ( next )

  return messages
}

MGraph.prototype.geMessagesByUrl = async function(url) {
  try {
    const responseString = await request.get({
      url: url,
      headers: { 
        Authorization: `Bearer ${this.tokens.access_token}`,
        Prefer: 'IdType="ImmutableId"'
      },
      timeout: 30000
    })
  
    return JSON.parse(responseString)

  } catch (ex) {

    if ( ex.statusCode === 404 )
      return null

    throw ex
  }
}

MGraph.prototype.discreteGetMessagessNative = async function* (url) {
  let next = null

  do {
    Context.log('discreteGetMessagessNative', url)
    const responseString = await request.get({
      url: url,
      headers: { 
        Authorization: `Bearer ${this.tokens.access_token}`,
        Prefer: 'IdType="ImmutableId"'
      },
      timeout: 30000
    })
    Metric.increment('microsoft.api.messages')

    const data = JSON.parse(responseString)

    next = data['@odata.nextLink'] || null
    url  = next

    yield data

  } while (next)
}

MGraph.prototype.batchGetMessagesNative = async function (messageIds, select, expand) {
  let counter = 1

  const requests = messageIds.map(message => ({
    'id': counter ++,
    'method': 'GET',
    'url': `/me/messages/${message}${select}${expand}`
  }))

  const options = {
    method: 'POST',
    url: 'https://graph.microsoft.com/v1.0/$batch',
    json: true,
    headers: {
      'Authorization': `Bearer ${this.tokens.access_token}`,
      Prefer: 'IdType="ImmutableId"',
    },
    body: {
      requests: requests
    }
  }
  
  const response = await request.post(options)
  Metric.increment('microsoft.batch.messages')
  return response
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

  const response = client.api(`/me/messages/${messageId}/attachments/${attachmentId}`).get()
  Metric.increment('microsoft.api.messages.attchments')
  return response
}

MGraph.prototype.getAttachmentNative = async function (messageId, attachmentId) {
  const options = {
    method: 'GET',
    url: `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments/${attachmentId}`,
    headers: { 
      Authorization: `Bearer ${this.tokens.access_token}`
    },
    timeout: 30000
  }

  const responseString = await request.get(options)
  Metric.increment('microsoft.api.messages.attchments')
  return JSON.parse(responseString)
}

MGraph.prototype.sendMultipartMessage = async function(email) {
  // Send Large Attachments
  // https://stackoverflow.com/questions/54673731/send-mail-with-large-attachment

  const client = await this.getClient()

  return await client.api('/me/sendMail').header('Prefer', 'IdType="ImmutableId"').post(email)
}

MGraph.prototype.createMessage = async function(email) {
  const client = await this.getClient()

  return await client.api('/me/messages').header('Prefer', 'IdType="ImmutableId"').post(email.message)
}

MGraph.prototype.createReply = async function(messageId) {
  // The internetMessageHeaders collection will only accept "custom headers".
  // In order to reply to a message, you need to use the /createReply endpoint and then update this message to add additional content/attachments before you send it
  // https://stackoverflow.com/questions/55945615/cannot-pass-in-reply-to-parameter-to-microsoft-graph-sendmail

  const client = await this.getClient()

  return await client.api(`/me/messages/${messageId}/createReply`).header('Prefer', 'IdType="ImmutableId"').post({})
}

MGraph.prototype.deleteDraft = async function(messageId) {
  const client = await this.getClient()

  return await client.api(`/me/messages/${messageId}`).header('Prefer', 'IdType="ImmutableId"').delete()
}

MGraph.prototype.updateMessage = async function(messageId, message) {
  const client = await this.getClient()

  return await client.api(`/me/messages/${messageId}`).header('Prefer', 'IdType="ImmutableId"').update(message)
}

MGraph.prototype.updateMessageNative = async function(messageId, message) {
  const options = {
    method: 'POST',
    url: `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
    json: true,
    headers: {
      'Authorization': `Bearer ${this.tokens.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'IdType="ImmutableId"'
    },
    body: JSON.stringify(message),
    timeout: 30000
  }
  
  const responseString = await request.post(options)

  return JSON.parse(responseString)
}

MGraph.prototype.updateMessageExtensionsNative = async function(messageId, data) {
  const options = {
    method: 'POST',
    url: `https://graph.microsoft.com/v1.0/me/messages/${messageId}/extensions`,
    json: true,
    headers: {
      'Authorization': `Bearer ${this.tokens.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'IdType="ImmutableId"'
    },
    body: data,
    timeout: 30000
  }

  /*
    {
      '@odata.context': "https://graph.microsoft.com/v1.0/$metadata#users('id')/messages('mid')/extensions/$entity",
      '@odata.type': '#microsoft.graph.openTypeExtension',
      id: 'Microsoft.OutlookServices.OpenTypeExtension.Rechat_Outlook_Ext',
      extensionName: 'Rechat_Outlook_Ext',
      rechatEmailId: '57e8faae-24d3-11ea-88cf-027d31a1f7a0',
      rechatHost: 'boer.api.rechat.com'
    }
  */

  return await request.post(options)
}

MGraph.prototype.updateIsRead = async function(messageIds, status) {
  let counter = 1

  const requests = messageIds.map(id => {
    return {
      'id': String(counter++),
      'method': 'PATCH',
      'url': `/me/messages/${id}`,
      'body': {
        'isRead': status
      },
      'headers': {
        'Content-Type': 'application/json',
        Prefer: 'IdType="ImmutableId"'
      }
    }
  })

  /*
    {
      "requests": [{
        "id": "1",
        "method": "PATCH",
        "url": "/me/messages/${messageId}",
        "body": { "isRead": true },
        "headers": { "Content-Type": "application/json" }
      }]
    }
  */

  return await this.batchRequestWithImmutableId({ requests })
}

MGraph.prototype.batchDelete = async function(messageIds) {
  let counter = 1

  // const requests = messageIds.map(id => {
  //   return {
  //     'id': String(counter++),
  //     'method': 'DELETE',
  //     'url': `/me/messages/${id}`
  //   }
  // })

  const requests = messageIds.map(id => {
    return {
      'id': String(counter++),
      'method': 'POST',
      'url': `/me/messages/${id}/move`,
      'body': {
        'destinationId': 'deleteditems'
      },
      'headers': {
        'Content-Type': 'application/json',
        Prefer: 'IdType="ImmutableId"'
      }
    }
  })

  return await this.batchRequestWithImmutableId({ requests })
}

MGraph.prototype.batchArchive = async function(messageIds) {
  let counter = 1

  const requests = messageIds.map(id => {
    return {
      'id': String(counter++),
      'method': 'POST',
      'url': `/me/messages/${id}/move`,
      'body': {
        'destinationId': 'archive'
      },
      'headers': {
        'Content-Type': 'application/json',
        Prefer: 'IdType="ImmutableId"'
      }
    }
  })

  return await this.batchRequestWithImmutableId({ requests })
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

  return await client.api(`/me/messages/${messageId}/send`).header('Prefer', 'IdType="ImmutableId"').post({})
}

MGraph.prototype.searchThreads = async function (limit, query, next) {
  const base   = 'https://graph.microsoft.com/v1.0/me/messages?$search='
  const select = '&$select=id,conversationId'
  const top    = `&$top=${limit}`

  const url = next || `${base}"${query.replace(/"/g, '\\"')}"${select}${top}`

  const responseString = await request.get({
    url: url,
    headers: { 
      Authorization: `Bearer ${this.tokens.access_token}`,
      Prefer: 'IdType="ImmutableId"'
    },
    timeout: 30000
  })
  Metric.increment('microsoft.api.messages')

  const data = JSON.parse(responseString)

  if ( !data.value ) {
    return {
      messages: [],
      next: null
    }
  }

  return {
    messages: data.value,
    next: data['@odata.nextLink'] || null
  }
}

MGraph.prototype.uploadSession = async function(messageId, attachment) {
  const client    = await this.getClient()
  const imageData = await request.get({ url: attachment.url, encoding: 'binary' })

  const data = Buffer.from(imageData, 'binary')
  const size = data.length // in bytes
  const name = attachment.name

  let location = null

  function getparams() {
    const chSize = 10
    const mega   = 1024 * 1024

    const sep = size < (chSize * mega) ? size : (chSize * mega) - 1
    const arr = []

    for (let i = 0; i < size; i += sep) {
      const bstart = i
      const bend   = ((i + sep - 1) < size) ? (i + sep - 1) : (size - 1)
      const cr     = 'bytes ' + bstart + '-' + bend + '/' + size
      const clen   = (bend !== (size - 1)) ? sep : (size - i)
      const stime  = size < (chSize * mega) ? 5000 : 10000

      arr.push({ bstart, bend, cr, clen, stime })
    }

    return arr
  }

  async function uploadFile(url) {
    const params = getparams()

    for await (const record of params) {
      const result = await request({
        url,
        method: 'PUT',
        headers: {
          'Content-Length': record.clen,
          'Content-Range': record.cr,
        },
        body: data.slice(record.bstart, record.bend + 1),
        resolveWithFullResponse: true
      })

      location = (result.headers && result.headers.location) ? result.headers.location : null
      // await await sleep(record.stime)
    }
  }

  const uploadSession    = { AttachmentItem: { attachmentType: 'file', name, size } }
  const uploadSessionUrl = `/me/messages/${messageId}/attachments/createUploadSession`

  const result = await client.api(uploadSessionUrl).version('beta').post(uploadSession)

  try {
    await uploadFile(result.uploadUrl)
    return location
  } catch (ex) {
    await request.delete(result.uploadUrl)
    throw ex
  }
}


// Subscription
MGraph.prototype.subscription = async function(messageId) {
  const client = await this.getClient()

  /*
    Flow

    1: Subscription request 
      POST https://graph.microsoft.com/v1.0/subscriptions
      Response: If successful, Microsoft Graph returns a 201 Created code and a subscription object in the body.

    2: Microsoft Graph sends a POST request to the notification URL:
      POST https://{notificationUrl}?validationToken={opaqueTokenCreatedByMicrosoftGraph}

    3: The client must provide a response with the following characteristics within 10 seconds:
      A 200 (OK) status code / Content type must be text/plain / Body must include the validation token
      Tip: The client should discard the validation token after providing it in the response.

    4: Renew
      PATCH https://graph.microsoft.com/v1.0/subscriptions/{id}
      { "expirationDateTime": "2016-03-22T11:00:00.0000000Z" } Content-Type: application/json

    5: Deleting a subscription
      DELETE https://graph.microsoft.com/v1.0/subscriptions/{id}
  */

  // https://docs.microsoft.com/en-us/graph/webhooks
  // https://docs.microsoft.com/en-us/graph/api/resources/subscription?view=graph-rest-1.0

  /*
    Expire Date: less than 3 days (config it for 1 day)

    Check this later (important): https://docs.microsoft.com/en-us/graph/webhooks-outlook-authz

    changeType: created, updated, deleted
    resource: Contacts => me/contacts , Calendars => me/events , Messages => me/messages


    Tip:
      At the moment, the lifecycleNotificationUrl property can only be set or read using the beta version of Microsoft Graph APIs
      So we combine both notificationUrl and lifecycleNotificationUrl

  */

  const subscription = {
    changeType: 'created,updated,deleted',
    notificationUrl: 'https://webhook.azurewebsites.net/api/send/myNotifyClient',
    resource: 'me/mailFolders(\'Inbox\')/messages',
    expirationDateTime: '2016-11-20T18:23:45.9356913Z',
    clientState: 'secretClientValue'
  }
 
  const response = await client.api('/subscriptions').header('Prefer', 'IdType="ImmutableId"').post(subscription)
  Metric.increment('microsoft.subscriptions.make')
  return response

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
          "resourceData": {
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

MGraph.prototype.listSubscriptions = async function() {
  const client = await this.getClient()

  return await client.api('/subscriptions').header('Prefer', 'IdType="ImmutableId"').get()

  /*
  {
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#subscriptions",
    "value": [{subscription object}]
  }
  */
}

MGraph.prototype.getSubscription = async function(id) {
  const client = await this.getClient()

  try {
    // If successful, this method returns a 200 OK response code and subscription object in the response body.
    const response = await client.api(`/subscriptions/${id}`).header('Prefer', 'IdType="ImmutableId"').get()
    return response

  } catch (ex) {
    if ( ex.statusCode === 404 )
      return null

    throw ex
  }
}

MGraph.prototype.createSubscription = async function(parmas) {
  const client = await this.getClient()

  /*
  {
    "@odata.context": "https://graph.microsoft.com/beta/$metadata#subscriptions/$entity",
    "id": "7f105c7d-2dc5-4530-97cd-4e7ae6534c07",
    "resource": "me/mailFolders('Inbox')/messages",
    "applicationId": "24d3b144-21ae-4080-943f-7067b395b913",
    "changeType": "created,updated",
    "clientState": "secretClientValue",
    "notificationUrl": "https://webhook.azurewebsites.net/api/send/myNotifyClient",
    "expirationDateTime": "2016-11-20T18:23:45.9356913Z",
    "creatorId": "8ee44408-0679-472c-bc2a-692812af3437"
  }
  */

  return await client.api('/subscriptions').header('Prefer', 'IdType="ImmutableId"').post(parmas)
}

MGraph.prototype.updateSubscription = async function(id, parmas) {
  const client = await this.getClient()

  // If successful, this method returns a 200 OK response code and subscription object in the response body.
  return await client.api(`/subscriptions/${id}`).header('Prefer', 'IdType="ImmutableId"').update(parmas)
}

MGraph.prototype.deleteSubscription = async function(id) {
  const client = await this.getClient()

  try {
    // If successful, this method returns a 204 No Content response code.
    await client.api(`/subscriptions/${id}`).header('Prefer', 'IdType="ImmutableId"').delete()
  } catch (ex) {
    if ( ex.statusCode !== 404 )
      throw ex
  }
}

MGraph.prototype.batchDeleteSubscription = async function(subIds) {
  let counter = 1

  const requests = subIds.map(id => {
    return {
      'id': String(counter++),
      'method': 'DELETE',
      'url': `/subscriptions/${id}`
    }
  })

  return await this.batchRequestWithImmutableId({ requests })
}


// Calendar
MGraph.prototype.listCalendars = async function() {
  const client = await this.getClient()

  try {
    const response = await client.api('/me/calendars').get()
    Metric.increment('microsoft.api.calendars')
    return response
  } catch (ex) {
    Metric.increment('microsoft.api.calendars.error')
    throw ex
  }
}

MGraph.prototype.createCalendar = async function(calendar) {
  const client = await this.getClient()
  try {
    const response = await client.api('/me/calendars').post(calendar)
    Metric.increment('microsoft.api.calendars.create')
    return response
  } catch (ex) {
    Metric.increment('microsoft.api.calendars.create.error')
    throw ex
  }
  // In case of duplicate calendar nam
  // {
  //   statusCode: 409,
  //   code: 'ErrorFolderExists',
  //   message: 'A folder with the specified name already exists.',
  //   requestId: 'f2696d38-8e72-4523-8b8d-62f5dc826e6f',
  //   date: 2020-01-13T14:45:09.000Z,
  //   body: '{"code":"ErrorFolderExists","message":"A folder with the specified name already exists."}'
  // }  
}

MGraph.prototype.getCalendar = async function(calendarId) {
  const client = await this.getClient()

  try {
    const response = await client.api(`/me/calendars/${calendarId}`).get()
    Metric.increment('microsoft.api.calendars.get')
    return response
  } catch (ex) {
    Metric.increment('microsoft.api.calendars.get.error')
    
    if ( ex.statusCode === 404 ) {
      return null
    }

    throw ex
  }
}

MGraph.prototype.updateCalendar = async function(calendarId, calendar) {
  const client = await this.getClient()

  // const calendar = {
  //   name: "Volunteer"
  // }
  
  return await client.api(`/me/calendar/${calendarId}`).update(calendar)
}

MGraph.prototype.deleteCalendar = async function(calendarId) {
  const client = await this.getClient()

  return await client.api(`/me/calendars/${calendarId}`).delete()
}

// Calendar Events
MGraph.prototype.syncEvents = async function (calendarId, timeMin, currentSyncToken = null) {
  const client = await this.getClient()

  let url = `/me/calendars/${calendarId}/events`
  
  let events = []
  let next   = null

  do {
    const response = await client.api(url).get()
    Metric.increment('microsoft.api.calendar.events')

    events = events.concat(response.value)
    next   = response['@odata.nextLink'] || null
    url    = next

  } while ( next )

  return events
}

// Calendar Events
MGraph.prototype.listEvents = async function (calendarId, filters, select) {
  const client = await this.getClient()

  let url = `/me/calendars/${calendarId}/events`
  
  let events = []
  let next   = null

  const filter_strings = []

  if (filters.starts_gt) {
    filter_strings.push(`start/DateTime ge '${filters.starts_gt.toISOString()}'`)
  }

  if (filters.starts_lt) {
    filter_strings.push(`start/DateTime lt '${filters.starts_lt.toISOString()}'`)
  }

  do {
    const req = client.api(url)
    if (filters) {
      req.filter(filter_strings.join(' and '))
    }

    if (select) {
      req.select(select)
    }

    const response = await req.get()
    Metric.increment('microsoft.api.calendar.events')

    events = events.concat(response.value)
    next   = response['@odata.nextLink'] || null
    url    = next
  } while ( next )

  return events
}

MGraph.prototype.createEvent = async function (calendarId, event) {
  const client = await this.getClient()

  // const event = {
  //   subject: "Let's go for lunch",
  //   body: {
  //     contentType: "HTML",
  //     content: "Does late morning work for you?"
  //   },
  //   start: {
  //       dateTime: "2017-04-15T12:00:00",
  //       timeZone: "Pacific Standard Time"
  //   },
  //   end: {
  //       dateTime: "2017-04-15T14:00:00",
  //       timeZone: "Pacific Standard Time"
  //   },
  //   location:{
  //       displayName:"Harry's Bar"
  //   },
  //   attendees: [
  //     {
  //       emailAddress: {
  //         address:"samanthab@contoso.onmicrosoft.com",
  //         name: "Samantha Booth"
  //       },
  //       type: "required"
  //     }
  //   ]
  // }
  
  Metric.increment('microsoft.api.calendar.events.create')
  return await client.api(`/me/calendar/${calendarId}/events`).post(event)
}

MGraph.prototype.batchInsertEvent = async function (chunks) {
  let retryAfterArr = []
  let confirmed     = []
  let toRetry       = []
  let failed        = []

  let retryAfter = 0
  let chunk      = chunks

  const bodyBuilder = function(events) {
    const requests = events.map(event => {
      return {
        'id': event.requestId,
        'method': 'POST',
        'url': `/me/calendars/${event.calendarId}/events`,
        'body': event.resource,
        'headers': {
          'Content-Type': 'application/json',
          'Prefer': `outlook.timezone="${event.timeZone}"`
        }
      }
    })

    return requests
  }

  do {

    const requests = bodyBuilder(chunk)
    const result   = await this.batchRequest({ requests })
    Metric.increment('microsoft.batch.calendar.events.create')
  
    confirmed = confirmed.concat(result.responses.filter(record => ( record.status === 200 || record.status === 201 )))
    failed    = failed.concat(result.responses.filter(record => ( record.status !== 200 && record.status !== 201 && record.status !== 429 )))
    toRetry   = result.responses.filter(record => ( record.status === 429 || record.status === 409 )).map(record => record.id)

    if (toRetry.length) {
      retryAfterArr = result.responses.filter(record => ( record.status === 429 )).map(record => record.headers['Retry-After'])
      retryAfter    = Math.max(...retryAfterArr)
  
      if (retryAfter) {
        await sleep(retryAfter * 1000)
      }

      chunk = chunks.filter(record => { if (toRetry.includes(record.requestId) || toRetry.includes(String(record.requestId))) return record })
    }

  } while ( toRetry.length !== 0 )

  return {
    confirmed,
    failed
  }
}

MGraph.prototype.batchUpdateEvent = async function (chunks) {
  let retryAfterArr = []
  let confirmed     = []
  let toRetry       = []
  let failed        = []

  let retryAfter = 0
  let chunk      = chunks

  const bodyBuilder = function(events) {
    const requests = events.map(event => {
      return {
        'id': event.requestId,
        'method': 'PATCH',
        'url': `/me/calendars/${event.calendar.calendar_id}/events/${event.eventId}`,
        'body': event.resource,
        'headers': {
          'Content-Type': 'application/json',
          'Prefer': `outlook.timezone="${event.timeZone}"`
        }
      }
    })

    return requests
  }

  do {

    const requests = bodyBuilder(chunk)
    const result   = await this.batchRequest({ requests })
    Metric.increment('microsoft.batch.calendar.events.update')

    confirmed = confirmed.concat(result.responses.filter(record => ( record.status === 200 || record.status === 201 )))
    failed    = failed.concat(result.responses.filter(record => ( record.status !== 200 && record.status !== 201 && record.status !== 429 )))
    toRetry   = result.responses.filter(record => ( record.status === 429 )).map(record => record.id)

    if (toRetry.length) {
      retryAfterArr = result.responses.filter(record => ( record.status === 429 )).map(record => record.headers['Retry-After'])
      retryAfter    = Math.max(...retryAfterArr)
  
      if (retryAfter) {
        await sleep(retryAfter * 1000)
      }

      chunk = chunks.filter(record => { if (toRetry.includes(record.requestId) || toRetry.includes(String(record.requestId))) return record })
    }

  } while ( toRetry.length !== 0 )

  return {
    confirmed,
    failed
  }
}

MGraph.prototype.batchGetEvents = async function (chunks) {
  let retryAfterArr = []
  let confirmed     = []
  let toRetry       = []
  let failed        = []

  let retryAfter = 0
  let requests   = chunks

  do {
    const result = await this.batchRequest({ requests })
    Metric.increment('microsoft.batch.calendar.events.get')

    confirmed = confirmed.concat(result.responses.filter(record => ( record.status === 200 || record.status === 201 )))
    failed    = failed.concat(result.responses.filter(record => ( record.status !== 200 && record.status !== 201 && record.status !== 429 )))
    toRetry   = result.responses.filter(record => ( record.status === 429 )).map(record => record.id)

    if (toRetry.length) {
      retryAfterArr = result.responses.filter(record => ( record.status === 429 )).map(record => record.headers['Retry-After'])
      retryAfter    = Math.max(...retryAfterArr)

      if (retryAfter) {
        await sleep(retryAfter * 1000)
      }

      requests = chunks.filter(record => { if (toRetry.includes(record.id) || toRetry.includes(String(record.id))) return record })
    }

  } while ( toRetry.length !== 0 )

  return confirmed
}

MGraph.prototype.batchDeleteEvents = async function (chunks) {
  let retryAfterArr = []
  let toRetry = []
  let failed  = []

  let retryAfter = 0
  let chunk      = chunks

  const bodyBuilder = function(events) {
    const requests = events.map(event => {
      return {
        'id': event.requestId,
        'method': 'DELETE',
        'url': `/me/calendars/${event.calendarId}/events/${event.eventId}`
      }
    })

    return requests
  }

  do {

    const requests = bodyBuilder(chunk)
    const result   = await this.batchRequest({ requests })
    Metric.increment('microsoft.batch.calendar.events.delete')

    failed  = failed.concat(result.responses.filter(record => ( record.status !== 200 && record.status !== 201 && record.status !== 204 && record.status !== 429 )))
    toRetry = result.responses.filter(record => ( record.status === 429 )).map(record => record.id)

    if (toRetry.length) {
      retryAfterArr = result.responses.filter(record => ( record.status === 429 )).map(record => record.headers['Retry-After'])
      retryAfter    = Math.max(...retryAfterArr)
  
      if (retryAfter) {
        await sleep(retryAfter * 1000)
      }

      chunk = chunks.filter(record => { if (toRetry.includes(record.requestId) || toRetry.includes(String(record.requestId))) return record })
    }

  } while ( toRetry.length !== 0 )

  return {
    failed
  }
}

MGraph.prototype.getEventInstances = async function (calendarId, eventId, startDateTime, endDateTime) {
  const client = await this.getClient()

  // '/me/events/AAMkAGUzYRgWAAA=/instances?startDateTime=2019-04-08T09:00:00.0000000&endDateTime=2019-04-30T09:00:00.0000000&$select=subject,bodyPreview,seriesMasterId,type,recurrence,start,end
  // /me/calendars/{id}/events/{id}/instances?startDateTime={start_datetime}&endDateTime={end_datetime}
  const url = `/me/calendars/${calendarId}/events/${eventId}/instances?startDateTime=${startDateTime}&endDateTime=${endDateTime}`
  Metric.increment('microsoft.api.calendar.event.instances')

  return await client.api(url).get()
}

MGraph.prototype.updateEvent = async function (calendarId, eventId, event) {
  const client = await this.getClient()

  // const event = {
  //   originalStartTimeZone: "originalStartTimeZone-value",
  //   originalEndTimeZone: "originalEndTimeZone-value",
  //   responseStatus: {
  //     response: "",
  //     time: "datetime-value"
  //   },
  //   recurrence: null,
  //   iCalUId: "iCalUId-value",
  //   reminderMinutesBeforeStart: 99,
  //   isReminderOn: true
  // }

  Metric.increment('microsoft.api.calendar.event.update')
  return await client.api(`/me/calendars/${calendarId}/events/${eventId}`).update(event)
}

MGraph.prototype.deleteEvent = async function (calendarId, eventId) {
  const client = await this.getClient()

  Metric.increment('microsoft.api.calendar.events.delete')
  return await client.api(`/me/calendars/${calendarId}/events/${eventId}`).delete()
}

MGraph.prototype.updateIdToImmutableId = async function(inputIds) {
  if(!Array.isArray(inputIds)) {
    inputIds = [inputIds]
  }

  if(inputIds.length > 1000) {
    throw new Error('The max length of ids to request is 1000')
  }
  const options = {
    method: 'POST',
    url: 'https://graph.microsoft.com/v1.0/me/translateExchangeIds',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.tokens.access_token}`,
      Prefer: 'IdType="ImmutableId"' 
    },
    body: JSON.stringify({
      inputIds,
      targetIdType: 'restImmutableEntryId',
      sourceIdType: 'restId'
    }),
    timeout: 30000
  }

  try {
    const responseString = await request.post(options)
    // Metric.increment('microsoft.token.auth')
    return JSON.parse(responseString)
  } catch (ex) {
    // @ts-ignore
    Metric.increment('microsoft.token.auth.error', [`status:${ex.statusCode}`])
    throw ex
  }
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
