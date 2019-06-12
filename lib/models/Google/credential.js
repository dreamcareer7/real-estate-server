const config  = require('../../config')
const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')

const GoogleCredential = {}



GoogleCredential.getAll = async (ids) => {
  const credentials = await db.select('google/credential/get', [ids])

  return credentials
}

GoogleCredential.get = async (id) => {
  const credentials = await GoogleCredential.getAll([id])

  if (credentials.length < 1)
    throw Error.ResourceNotFound(`Google-Credential ${id} not found`)

  return credentials[0]
}

GoogleCredential.getByUser = async (user, brand) => {
  const ids = await db.selectIds('google/credential/get_by_user', [user, brand])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-Credential ${user} not found`)

  return GoogleCredential.get(ids[0])
}

GoogleCredential.getByEmail = async (email) => {
  const ids = await db.selectIds('google/credential/get_by_email', [email])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-Credential ${email} not found`)

  return GoogleCredential.get(ids[0])
}

GoogleCredential.publicize = async model => {
  delete model.access_token
  delete model.refresh_token
  delete model.expiry_date
  delete model.contacts_sync_token
  delete model.contact_groups_sync_token
  delete model.messages_sync_history_id
  delete model.threads_sync_history_id

  return model
}

GoogleCredential.create = async (body) => {
  return db.insert('google/credential/insert',[
    body.user,
    body.brand,

    body.profile.resourceName,
    body.profile.emailAddress,
    body.profile.displayName || null,
    body.profile.firstName || null,
    body.profile.lastName || null,
    body.profile.photo || null,

    body.profile.messagesTotal || null,
    body.profile.threadsTotal || null,
    body.profile.historyId || null,
  
    body.tokens.access_token,
    body.tokens.refresh_token,
    new Date(body.tokens.expiry_date),

    JSON.stringify(body.scope)
  ])
}

GoogleCredential.checkPermission = async (user, brand) => {
  const credential = await GoogleCredential.getByUser(user, brand)

  if (!credential) {
    return false
    // return res.status(404).json({ status: false, message: 'no-gmail-access' })
  }

  if (credential.revoked) {
    return false
    // return res.json({ status: true, message: 'already-revokeded' })
  }

  return true
}

GoogleCredential.updateTokens = async (id, tokens) => {
  return db.update('google/credential/update_tokens', [
    tokens.access_token,
    tokens.refresh_token,
    tokens.expiry_date,
    id
  ])
}

GoogleCredential.updateRefreshToken = async (id, refreshToken) => {
  return db.update('google/credential/update_refresh_token', [
    id,
    refreshToken,
    new Date()
  ])
}

GoogleCredential.updateAccesshToken = async (id, accessToken) => {
  return db.update('google/credential/update_access_token', [
    id,
    accessToken,
    new Date()
  ])
}

GoogleCredential.updateAsRevoked = async (user, brand) => {
  return db.update('google/credential/revoked', [
    user,
    brand
  ])
}

GoogleCredential.updateProfile = async (id, profile) => {
  return db.update('google/credential/update_profile', [
    profile.displayName || null,
    profile.firstName || null,
    profile.lastName || null,
    profile.photo || null,
    id
  ])
}

GoogleCredential.updateGmailProfile = async (id, profile) => {
  return db.update('google/credential/update_gmail_profile', [
    profile.messagesTotal,
    profile.threadsTotal,
    profile.historyId,
    id
  ])
}

GoogleCredential.updateContactsSyncToken = async (id, syncToken) => {
  return db.update('google/credential/update_contacts_sync_token', [
    id,
    syncToken,
    new Date()
  ])
}

GoogleCredential.updateContactGroupsSyncToken = async (id, syncToken) => {
  return db.update('google/credential/update_contact_groups_sync_token', [
    id,
    syncToken,
    new Date()
  ])
}

GoogleCredential.updateMessagesSyncHistoryId = async (id, syncToken) => {
  return db.update('google/credential/update_messages_sync_history_id', [
    id,
    syncToken,
    new Date()
  ])
}

GoogleCredential.updateThreadsSyncHistoryId = async (id, syncToken) => {
  return db.update('google/credential/update_threads_sync_history_id', [
    id,
    syncToken,
    new Date()
  ])
}

GoogleCredential.updateLastSyncTime = async (id, ts, duration) => {
  await db.update('google/credential/update_last_sync', [
    new Date(ts),
    duration,
    id
  ])
}

GoogleCredential.syncJob = async () => {
  const rows = await db.select('google/credential/sync_due', [config.google_sync.gap_hour])
  const ids  = rows.map(r => r.id)

  for (const id of ids) {
    const googleCredential = await GoogleCredential.get(id)

    const data = {
      action: 'google_sync',
      googleCredential: googleCredential
    }

    const job = Job.queue.create('google_sync', data).removeOnComplete(true)
    Context.get('jobs').push(job)
  }

  return ids
}



Orm.register('google_credential', 'GoogleCredential', GoogleCredential)

module.exports = GoogleCredential