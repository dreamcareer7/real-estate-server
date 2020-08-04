const db  = require('../../utils/db.js')
const Orm = require('../Orm/registry')
const KMS = require('../KMS')


const encryptTokens = async (tokens) => {
  const promises = []

  promises.push(KMS.encrypt(new Buffer(tokens.access_token, 'utf-8')))
  promises.push(KMS.encrypt(new Buffer(tokens.refresh_token, 'utf-8')))

  const result = await Promise.all(promises)

  return {
    aToken: result[0],
    rToken: result[1]
  }
}

const decryptTokens = async (aToken, rToken) => {
  const promises = []

  promises.push(KMS.decrypt(new Buffer(aToken, 'base64')))
  promises.push(KMS.decrypt(new Buffer(rToken, 'base64')))  

  const result = await Promise.all(promises)

  return {
    aToken: result[0],
    rToken: result[1]
  }
}


const MicrosoftCredential = {}


/**
 * @returns {Promise<IMicrosoftCredential[]>}
 */
MicrosoftCredential.getAll = async (ids) => {
  const credentials =  await db.select('microsoft/credential/get', [ids])

  for (const credential of credentials) {
    const { aToken, rToken } = await decryptTokens(credential.access_token, credential.refresh_token)

    credential.access_token  = aToken
    credential.refresh_token = rToken
  }

  return credentials
}

MicrosoftCredential.get = async (id) => {
  const credentials = await MicrosoftCredential.getAll([id])

  if (credentials.length < 1)
    throw Error.ResourceNotFound(`Microsoft-Credential ${id} not found`)

  return credentials[0]
}

/**
 * @param {UUID} user
 * @param {UUID} brand
 */
MicrosoftCredential.findByUser = (user, brand) => {
  return db.selectIds('microsoft/credential/get_by_user', [user, brand])
}

/**
 * @param {UUID} user
 * @param {UUID} brand
 */
MicrosoftCredential.getByUser = async (user, brand) => {
  const ids = await MicrosoftCredential.findByUser(user, brand)

  if (ids.length < 1)
    return []

  return await MicrosoftCredential.getAll(ids)
}

/**
 * @param {UUID} brand
 */
MicrosoftCredential.getByBrand = async (brand) => {
  const ids = await db.selectIds('microsoft/credential/get_by_brand', [brand])

  if (ids.length < 1) {
    return []
  }

  return await MicrosoftCredential.getAll(ids)
}

MicrosoftCredential.publicize = async model => {
  delete model.access_token
  delete model.refresh_token
  delete model.id_token
  delete model.expires_in
  delete model.ext_expires_in

  model.profile_image_url = model.photo

  return model
}

MicrosoftCredential.create = async (body) => {
  const { aToken, rToken } = await encryptTokens(body.tokens)

  return db.insert('microsoft/credential/insert',[
    body.user,
    body.brand,
    body.profile.email,
    body.profile.remote_id,
    body.profile.displayName || null,
    body.profile.firstName || null,
    body.profile.lastName || null,
    body.profile.photo || null,
    aToken,
    rToken,
    body.tokens.id_token,
    (new Date().getTime() + (body.tokens.expires_in * 1000)),
    (new Date().getTime() + (body.tokens.ext_expires_in * 1000)),
    JSON.stringify(body.scope),
    JSON.stringify(body.scopeSummary)
  ])
}

MicrosoftCredential.updateTokens = async (id, tokens) => {
  const { aToken, rToken } = await encryptTokens(tokens)

  return db.update('microsoft/credential/update_tokens', [
    aToken,
    rToken,
    tokens.id_token,
    (new Date().getTime() + (tokens.expires_in * 1000)),
    (new Date().getTime() + (tokens.ext_expires_in * 1000)),
    id
  ])
}

MicrosoftCredential.updateAsRevoked = async (id) => {
  return db.update('microsoft/credential/revoked', [id])
}

MicrosoftCredential.updateSendEmailAfter = async (id, ts) => {
  return await db.select('microsoft/credential/update_send_email_after', [id, ts])
}

MicrosoftCredential.disconnect = async (id) => {
  return db.update('microsoft/credential/disconnect', [id, new Date()])
}

MicrosoftCredential.updateProfile = async (id, profile) => {
  return db.update('microsoft/credential/update_profile', [
    profile.displayName || null,
    profile.givenName || null,
    profile.surname || null,
    profile.photo || null,
    id
  ])
}

MicrosoftCredential.updateRechatMicrosoftCalendar = async (id, calendarId) => {
  return db.update('microsoft/credential/update_rechat_mcalendar', [id, calendarId])
}

MicrosoftCredential.resetRechatMicrosoftCalendar = async (id) => {
  return MicrosoftCredential.updateRechatMicrosoftCalendar(id, null)
}

MicrosoftCredential.hasSendEmailAccess = async (id) => {
  const credential = await MicrosoftCredential.get(id)

  if ( credential.scope_summary.includes('mail.send') && credential.scope_summary.includes('mail.modify') )
    return credential
  
  throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')
}


MicrosoftCredential.associations = {
  jobs: {
    collection: true,
    enabled: true,
    model: 'UsersJob'
  }
}

Orm.register('microsoft_credential', 'MicrosoftCredential', MicrosoftCredential)

module.exports = MicrosoftCredential
