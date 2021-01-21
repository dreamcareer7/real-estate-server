const db = require('../../../utils/db')

/**
 * Get contact attributes by id without any restriction
 * @param {UUID[]} ids
 * @returns {Promise<IContactAttribute[]>}
 */
async function getAll(ids) {
  const attributes = await db.select('contact/attribute/get', [ids])

  return attributes
}

/**
 * Get a ContactAttribute by id
 * @param {UUID} id ContactAttribute id
 */
async function get(id) {
  const attributes = await getAll([id])

  if (!attributes || attributes.length < 1) {
    throw Error.ResourceNotFound(`ContactAttribute ${id} not found`)
  }

  return attributes[0]
}

/**
 * Gets all attributes for a given contact
 * @param {UUID[]} contact_ids
 * @param {UUID[]=} attribute_defs
 * @param {string[]=} attribute_types
 * @returns {Promise<IContactAttribute[]>}
 */
async function getForContacts(contact_ids, attribute_defs, attribute_types) {
  const ids = await db.selectIds('contact/attribute/for_contacts', [
    contact_ids,
    attribute_defs,
    attribute_types
  ])

  if (ids.length < 1) return []

  return getAll(ids)
}

module.exports = {
  getAll,
  get,
  getForContacts,
}
