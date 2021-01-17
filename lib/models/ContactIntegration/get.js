const db = require('../../utils/db.js')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('contact_integration/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const contacts = await getAll([id])

  if (contacts.length < 1) {
    throw Error.ResourceNotFound(`Contact integration by id ${id} not found.`)
  }

  return contacts[0]
}

/**
 * @param {UUID[]} google_ids
 */
const getByGoogleIds = async (google_ids) => {
  const ids = await db.selectIds('contact_integration/get_by_google_ids', [google_ids])

  if (ids.length < 1) {
    return []
  }

  return await getAll(ids)
}

/**
 * @param {UUID[]} microsoft_ids
 */
const getByMicrosoftIds = async (microsoft_ids) => {
  const ids = await db.selectIds('contact_integration/get_by_microsoft_ids', [microsoft_ids])

  if (ids.length < 1) {
    return []
  }

  return await getAll(ids)
}

/**
 * @param {UUID[]} contact_ids
 */
const getByContacts = async (contact_ids) => {
  const ids = await db.selectIds('contact_integration/get_by_contacts', [contact_ids])

  if (ids.length < 1) {
    return []
  }

  return await getAll(ids)
}


module.exports = {
  getAll,
  get,
  getByGoogleIds,
  getByMicrosoftIds,
  getByContacts
}