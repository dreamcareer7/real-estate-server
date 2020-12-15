const db = require('../../../utils/db.js')
const sq = require('../../../utils/squel_extensions')



/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('google/contact/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const contacts = await getAll([id])

  if (contacts.length < 1) {
    throw Error.ResourceNotFound(`Google contact by id ${id} not found.`)
  }

  return contacts[0]
}

/**
 * @param {UUID} google_credential
 * @param {String[]} entry_ids
 */
const getByEntryIds = async (google_credential, entry_ids) => {
  const ids = await db.selectIds('google/contact/get_by_entry_ids', [google_credential, entry_ids])

  if (ids.length < 1) {
    return []
  }

  return getAll(ids)
}

/**
 * @param {UUID} google_credential
 * @param {String} entry_id
 */
const getByEntryId = async (google_credential, entry_id) => {
  const result = await getByEntryIds(google_credential, [entry_id])

  if (result.length < 1) {
    return null
  }

  return result[0]
}

/**
 * @param {UUID} google_credential
 * @param {String[]} resource_ids
 */
const getByResourceIds = async (google_credential, resource_ids) => {
  const ids = await db.select('google/contact/get_by_resource_ids', [google_credential, resource_ids])

  if (ids.length < 1) {
    return []
  }

  return getAll(ids)
}

/**
 * @param {UUID} google_credential
 * @param {String} resource_id
 */
const getByResourceId = async (google_credential, resource_id) => {
  const result = await getByResourceIds(google_credential, [resource_id])

  if (result.length < 1) {
    return []
  }

  return result[0]
}

/**
 * @param {UUID} google_credential
 */
const getGCredentialContactsNum = async (google_credential) => {
  return await db.select('google/contact/count', [google_credential])
}

const filter = async ({ google_credential, processed_photo }) => {
  const query = sq.select()
    .field('id, google_credential, resource_id, resource->>\'photo\' as org_photo, processed_photo, photo')
    .from('google_contacts')

  if (google_credential) {
    query.where('google_credential = ?', google_credential)
  }

  if (processed_photo !== null) {
    query.where('processed_photo = ?', processed_photo)
  }

  query.where('deleted_at IS NULL')

  return await db.select(query, [])
}


/**
 * @param {UUID} google_credential
 */
const getRefinedContactGroups = async (google_credential) => {
  const contactGroups = await db.select('google/contact_group/get_by_credential', [google_credential])
  const refined = {}

  for (const cg of contactGroups) {
    refined[cg.resource_id] = cg.resource_name
  }

  return refined
}


module.exports = {
  getAll,
  get,
  getByEntryIds,
  getByEntryId,
  getByResourceIds,
  getByResourceId,
  getGCredentialContactsNum,
  filter,
  getRefinedContactGroups
}