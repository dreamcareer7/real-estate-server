const db = require('../../../utils/db.js')
const sq = require('../../../utils/squel_extensions')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('microsoft/contact/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const contacts = await getAll([id])

  if (contacts.length < 1) {
    throw Error.ResourceNotFound(`Microsoft contact by id ${id} not found.`)
  }

  return contacts[0]
}

/**
 * @param {UUID} microsoft_credential
 */
const getByMicrosoftCredential = async (microsoft_credential) => {
  const ids = await db.selectIds('microsoft/contact/get_by_microsoft_credential', [microsoft_credential])

  if (ids.length < 1) {
    return []
  }

  return getAll(ids)
}

/**
 * @param {UUID} microsoft_credential
 * @param {String[]} remote_ids
 */
const getByRemoteIds = async (microsoft_credential, remote_ids) => {
  const ids = await db.selectIds('microsoft/contact/get_by_remote_ids', [microsoft_credential, remote_ids])

  if (ids.length < 1) {
    return []
  }

  return getAll(ids)
}

/**
 * @param {UUID} microsoft_credential
 * @param {String} remote_id
 */
const getByRemoteId = async (microsoft_credential, remote_id) => {
  const result = await getByRemoteIds(microsoft_credential, [remote_id])

  if (result.length < 1) {
    return null
  }

  return result[0]
}

const getAllBySource = async (microsoft_credential, remote_ids, source) => {
  return await db.select('microsoft/contact/get_by_source', [remote_ids, microsoft_credential, source])
}

/**
 * @param {UUID} microsoft_credential
 * @param {String[]?} sourceArr
 */
const getMCredentialContactsAddress = async (microsoft_credential, sourceArr = null) => {
  const contacts = await db.select('microsoft/contact/get_by_credential', [microsoft_credential])
  const emails   = new Set()

  if (!sourceArr) {
    sourceArr = ['contacts', 'sentBox']
  }

  if ( contacts.length > 0 ) {
    for (const contact of contacts) {
      for (const address of contact.data.emailAddresses) {

        if ( sourceArr.includes(contact.source) ) {
          emails.add(address.address)
        }
      }
    }
  }
  
  return emails
}

/**
 * @param {UUID} microsoft_credential
 * @param {String[]} sourceArr
 */
const getMCredentialContactsNum = async (microsoft_credential, sourceArr) => {
  return await db.select('microsoft/contact/count', [microsoft_credential, sourceArr])
}

/**
 * @param {UUID} microsoft_credential
 * @param {UUID[]} contact_ids
 */
const getByRechatContacts = async (microsoft_credential, contact_ids) => {
  const ids = await db.selectIds('microsoft/contact/get_by_rechat_contacts', [microsoft_credential, contact_ids])

  if (ids.length < 1) {
    return []
  }

  return getAll(ids)
}

const filter = async ({ microsoft_credential, source, processed_photo }) => {
  const query = sq.select()
    .field('id, microsoft_credential, remote_id, contact, source, processed_photo, photo')
    .from('microsoft_contacts')

  if (microsoft_credential) {
    query.where('microsoft_credential = ?', microsoft_credential)
  }

  if (source) {
    query.where('source = ?', source)
  }

  if ( processed_photo !== null ) {
    query.where('processed_photo = ?', processed_photo)
  }

  query.where('deleted_at IS NULL')

  return await db.select(query, [])
}

/**
 * @param {UUID} microsoft_credential
 */
const getCredentialFolders = async (microsoft_credential) => {
  const contactFolders = await db.select('microsoft/contact_folder/get_by_credential', [microsoft_credential])

  return contactFolders.map(cf => ({ id: cf.id, folder_id: cf.folder_id, sync_token: cf.sync_token, parent_folder_id: cf.parent_folder_id }))
}

/**
 * @param {UUID} microsoft_credential
 */
const getRefinedContactFolders = async (microsoft_credential) => {
  const contactFolders = await db.select('microsoft/contact_folder/get_by_credential', [microsoft_credential])

  if ( contactFolders.length > 0 ) {

    const refined = {}

    contactFolders.map(cf => {
      refined[cf.folder_id] = cf.display_name
    })

    return refined
  }

  return null
}

/**
 * @param {UUID} microsoftCredential
 * @param {string[]} remoteIds
 */
const getByParentFolderId = async (microsoftCredential, remoteIds) => {
  return db.select('microsoft/contact/get_by_remote_folder_id', [microsoftCredential, remoteIds])
}

module.exports = {
  getAll,
  get,
  getByMicrosoftCredential,
  getByRemoteIds,
  getByRemoteId,
  getAllBySource,
  getMCredentialContactsAddress,
  getMCredentialContactsNum,
  getByRechatContacts,
  filter,
  getCredentialFolders,
  getRefinedContactFolders,
  getByParentFolderId
}