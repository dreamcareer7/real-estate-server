const config  = require('../../config')
const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Job     = require('../Job')
const Context = require('../Context')

const MicrosoftCredential = {}



MicrosoftCredential.getAll = async (ids) => {
  return await db.select('microsoft/credential/get', [ids])
}

MicrosoftCredential.get = async (id) => {
  const credentials = await MicrosoftCredential.getAll([id])

  if (credentials.length < 1)
    throw Error.ResourceNotFound(`Microsoft-Credential ${id} not found`)

  return credentials[0]
}

MicrosoftCredential.getByUser = async (user, brand) => {
  const ids = await db.selectIds('microsoft/credential/get_by_user', [user, brand])

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

  return model
}

MicrosoftCredential.create = async (body) => {
  return db.insert('microsoft/credential/insert',[
    body.user,
    body.brand,

    body.profile.email,
    body.profile.remote_id,
    body.profile.displayName || null,
    body.profile.firstName || null,
    body.profile.lastName || null,
    body.profile.photo || null,

    body.tokens.access_token,
    body.tokens.refresh_token,
    body.tokens.id_token,
    body.tokens.expires_in,
    body.tokens.ext_expires_in,

    JSON.stringify(body.tokens.scope.split(' '))
  ])
}

MicrosoftCredential.updateTokens = async (id, tokens) => {
  return db.update('microsoft/credential/update_tokens', [
    tokens.access_token,
    tokens.refresh_token,
    tokens.id_token,
    tokens.expires_in,
    tokens.ext_expires_in,
    id
  ])
}

MicrosoftCredential.updateAsRevoked = async (id) => {
  return db.update('microsoft/credential/revoked', [id])
}

MicrosoftCredential.updateLastSync = async (id, ts, duration) => {
  const res = await db.select('microsoft/credential/update_last_sync', [
    new Date(ts),
    duration,
    id
  ])

  console.log('updateLastSync', res)
}

MicrosoftCredential.updateSyncStatus = async (id, status) => {
  const res = await db.select('microsoft/credential/update_last_sync_status', [
    id,
    status
  ])
}

MicrosoftCredential.disableEnableSync = async (id, action) => {
  const microsoftCredential = await MicrosoftCredential.get(id)

  if (!microsoftCredential)
    throw Error.BadRequest('You have not any connected account!')

  if (microsoftCredential.revoked)
    return true

  let deleted_at = null

  if ( action === 'disable' ) {
    if (microsoftCredential.deleted_at)
      return true

    deleted_at = new Date()
  }

  if ( action === 'enable' ) {
    if (!microsoftCredential.deleted_at)
      return true
  }

  return db.update('microsoft/credential/diable_sync', [microsoftCredential.id, deleted_at])
}

MicrosoftCredential.updateProfile = async (id, profile) => {
  return db.update('microsoft/credential/update_profile', [
    profile.displayName || null,
    profile.firstName || null,
    profile.lastName || null,
    profile.photo || null,
    id
  ])
}

MicrosoftCredential.updateContactsLastSyncAt = async (id) => {
  return db.update('microsoft/credential/update_contacts_last_sync_at', [
    id,
    new Date()
  ])
}

MicrosoftCredential.syncJob = async () => {
  const rows = await db.select('microsoft/credential/sync_due', [config.microsoft_sync.gap_hour])
  const ids  = rows.map(r => r.id)

  for (const id of ids) {
    const microsoftCredential = await MicrosoftCredential.get(id)

    const data = {
      action: 'microsoft_sync',
      microsoftCredential: microsoftCredential
    }

    await MicrosoftCredential.updateSyncStatus(microsoftCredential.id, 'pending')

    const job = Job.queue.create('microsoft_sync', data).removeOnComplete(true)
    Context.get('jobs').push(job)
  }

  return ids
}


Orm.register('microsoft_credential', 'MicrosoftCredential', MicrosoftCredential)

module.exports = MicrosoftCredential