const db  = require('../../utils/db.js')
const Orm = require('../Orm')
const KMS = require('../KMS')
const UsersJobs = require('../UsersJob')


const thirtySecondsGap = () => {
  const uts = new Date().getTime()
  const gap = uts - (30 * 1000)

  return new Date(gap)
}

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

MicrosoftCredential.updateLastSync = async (id, duration) => {
  await db.select('microsoft/credential/update_last_sync', [
    id,
    duration,
    thirtySecondsGap()
  ])
}

MicrosoftCredential.updateSyncStatus = async (id, status) => {
  return await db.select('microsoft/credential/update_last_sync_status', [
    id,
    status
  ])
}

MicrosoftCredential.updateSendEmailAfter = async (id, ts) => {
  return await db.select('microsoft/credential/update_send_email_after', [id, ts])
}

MicrosoftCredential.postponeOutlookSync = async (id) => {
  await db.select('microsoft/credential/postpone_outlook_sync', [id])
}

MicrosoftCredential.postponeCalendarSync = async (id) => {
  await db.select('microsoft/credential/postpone_cal_sync', [id])
}

MicrosoftCredential.disableSync = async (id) => {
  return db.update('microsoft/credential/diable_enable_sync', [id, new Date()])
}

MicrosoftCredential.enableSync = async (id) => {
  return db.update('microsoft/credential/diable_enable_sync', [id, null])
}

MicrosoftCredential.forceSync = async (id) => {
  const credential = await MicrosoftCredential.get(id)

  if ( credential.deleted_at )
    throw Error.BadRequest('Microsoft-Credential is deleted!')

  if ( credential.revoked )
    throw Error.BadRequest('Microsoft-Account is revoked!')

  if ( credential.last_sync_at === null && credential.sync_status === null )
    throw Error.BadRequest('Please wait until current sync job is finished.')

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job is finished.')

  return db.update('microsoft/credential/force_sync', [id])
}

MicrosoftCredential.forceSyncCalendar = async (id) => {
  const credential = await MicrosoftCredential.get(id)

  if ( credential.deleted_at ) {
    throw Error.BadRequest('Microsoft-Credential is deleted!')
  }

  if ( credential.revoked ) {
    throw Error.BadRequest('Microsoft-Account is revoked!')
  }

  if ( !credential.microsoft_calendar ) {
    throw Error.BadRequest('No Rechat Special Calendar!')
  }

  if ( credential.calendars_last_sync_at === null ) {
    throw Error.BadRequest('Please wait until current sync job is finished.')
  }

  const job = await UsersJobs.getByMicrosoftCredential(credential.id, 'calendar')

  if ( job && job.status === 'pending' ) {
    throw Error.BadRequest('Please wait until current sync job is finished.')
  }

  return db.update('microsoft/credential/cal_force_sync', [id])
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

MicrosoftCredential.updateContactsLastSyncAt = async (id) => {
  return db.update('microsoft/credential/update_contacts_last_sync_at', [
    id,
    thirtySecondsGap()
  ])
}

MicrosoftCredential.updateContactsLastExtractAt = async (id) => {
  return db.update('microsoft/credential/update_contacts_last_extract_at', [
    id,
    thirtySecondsGap()
  ])
}

MicrosoftCredential.updateMessagesLastSyncAt = async (id) => {
  return db.update('microsoft/credential/update_messages_last_sync_at', [
    id,
    thirtySecondsGap()
  ])
}

MicrosoftCredential.updateRechatMicrosoftCalendar = async (id, calendarId) => {
  return db.update('microsoft/credential/update_rechat_mcalendar', [id, calendarId])
}

MicrosoftCredential.resetRechatGoogleCalendar = async (id) => {
  return MicrosoftCredential.updateRechatMicrosoftCalendar(id, null)
}

MicrosoftCredential.updateCalendarsLastSyncAt = async (id, ts = new Date()) => {
  return db.update('microsoft/credential/update_calendars_last_sync_at', [id, ts])
}

MicrosoftCredential.hasSendEmailAccess = async (id) => {
  const credential = await MicrosoftCredential.get(id)

  if ( credential.scope_summary.includes('mail.send') && credential.scope_summary.includes('mail.modify') )
    return credential
  
  throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')
}


MicrosoftCredential.associations = {
  histories: {
    collection: true,
    enabled: false,
    model: 'MicrosoftSyncHistory'
  }
}

Orm.register('microsoft_credential', 'MicrosoftCredential', MicrosoftCredential)

module.exports = MicrosoftCredential
