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
  delete model.scope
  delete model.contacts_sync_token
  delete model.contact_groups_sync_token
  delete model.messages_sync_token

  return model
}

GoogleCredential.create = async (body) => {
  return db.insert('google/credential/insert',[
    body.gmailAuthLink.user,
    body.gmailAuthLink.brand,
    body.gmailAuthLink.email,
  
    body.profile.messagesTotal,
    body.profile.threadsTotal,
    body.profile.historyId,
  
    body.tokens.access_token,
    body.tokens.refresh_token,
    new Date(body.tokens.expiry_date),
  
    body.tokens.scope
  ])
}

GoogleCredential.checkPermission = async (user, brand) => {
  const credential = await GoogleCredential.getByUser(user, brand)

  if(!credential) {
    return false
    // return res.status(404).json({ status: false, message: 'no-gmail-access' })
  }

  if(credential.revoked) {
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

GoogleCredential.updateAsRevoked = async (user, brand) => {
  return db.update('google/credential/revoked', [
    user,
    brand
  ])
}

GoogleCredential.updateProfile = async (id, profile) => {
  return db.update('google/credential/update_profile', [
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


GoogleCredential.updateLastProfileSyncTime = async (id) => {
  await db.update('google/credential/update_last_profile_sync', [
    new Date(),
    id
  ])
}

GoogleCredential.updateLastContactsSyncTime = async (id) => {
  await db.update('google/credential/update_last_contacts_sync', [
    new Date(),
    id
  ])
}

GoogleCredential.updateLastContactGroupsSyncTime = async (id) => {
  await db.update('google/credential/update_last_contact_groups_sync', [
    new Date(),
    id
  ])
}

GoogleCredential.updateLastMessagesSyncTime = async (id) => {
  await db.update('google/credential/update_last_messages_sync', [
    new Date(),
    id
  ])
}


GoogleCredential.syncProfileJob = async () => {
  const rows = await db.select('google/credential/profile_sync_due', [config.google_credential.sync_profile_gap_hour])
  const ids  = rows.map(r => r.id)

  let firstSync = true

  for(const id of ids) {
    const googleCredential = await GoogleCredential.get(id)

    if( googleCredential.last_profile_sync_at )
      firstSync = false

    // action enum : sync_profile / sync_contacts / sync_contact_groups / sync_messages
    const data = {
      meta: {
        firstSync: firstSync,
        action: 'sync_profile'
      },
      googleCredential: googleCredential
    }

    const job = Job.queue.create('google_sync_profile', data).removeOnComplete(true)
    Context.get('jobs').push(job)
  }

  return ids
}

GoogleCredential.syncContactsJob = async () => {
  const rows = await db.select('google/credential/contacts_sync_due', [config.google_credential.sync_contacts_gap_hour])
  const ids  = rows.map(r => r.id)

  let partialSync = false

  for(const id of ids) {
    const googleCredential = await GoogleCredential.get(id)

    if( googleCredential.last_contacts_sync_at )
      partialSync = true

    const data = {
      meta: {
        partialSync: partialSync,
        action: 'sync_contacts'
      },
      googleCredential: googleCredential
    }

    const job = Job.queue.create('google_sync_contacts', data).removeOnComplete(true)
    Context.get('jobs').push(job)
  }

  return ids
}

GoogleCredential.syncContactGroupsJob = async () => {
  const rows = await db.select('google/credential/contact_roups_sync_due', [config.google_credential.sync_contact_groups_gap_hour])
  const ids  = rows.map(r => r.id)

  let partialSync = false

  for(const id of ids) {
    const googleCredential = await GoogleCredential.get(id)

    if( googleCredential.last_contact_groups_sync_at )
      partialSync = true

    const data = {
      meta: {
        partialSync: partialSync,
        action: 'sync_contact_groups'
      },
      googleCredential: googleCredential
    }

    const job = Job.queue.create('google_sync_contact_groups', data).removeOnComplete(true)
    Context.get('jobs').push(job)
  }

  return ids
}

GoogleCredential.syncMessagesJob = async () => {
  const rows = await db.select('google/credential/messages_sync_due', [config.google_credential.sync_messages_gap_hour])
  const ids  = rows.map(r => r.id)

  let partialSync = false

  for(const id of ids) {
    const googleCredential = await GoogleCredential.get(id)

    if( googleCredential.last_messages_sync_at )
      partialSync = true

    const data = {
      meta: {
        partialSync: partialSync,
        action: 'sync_messages'
      },
      googleCredential: googleCredential
    }

    const job = Job.queue.create('google_sync_messages', data).removeOnComplete(true)
    Context.get('jobs').push(job)
  }

  return ids
}


Orm.register('google_credential', 'GoogleCredential', GoogleCredential)

module.exports = GoogleCredential