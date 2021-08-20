const db = require('../../../utils/db.js')

async function get(id) {
  const result = await getAll([id])

  if (result.length < 1) {
    throw Error.ResourceNotFound(`ContactAttributeDef ${id} not found.`)
  }

  return result[0]
}

/**
 * Gets attribute defs given their ids. No questions asked.
 * @param {UUID[]} ids 
 * @returns {Promise<IContactAttributeDef[]>}
 */
async function getAll(ids) {
  return await db.select('contact/attribute_def/get', [
    ids
  ])
}

/**
 * Get all global and custom attributes accessible to the user
 * @param {UUID} brand_id User id requesting attributes
 * @returns {Promise<UUID[]>}
 */
function getForBrand(brand_id) {
  return db.selectIds('contact/attribute_def/for_brand', [
    brand_id
  ])
}

/**
 * Get all global attributes accessible to everyone
 * @returns {Promise<UUID[]>}
 */
function getGlobalDefs() {
  return db.selectIds('contact/attribute_def/globals', [])
}

/**
 * @param {UUID} brand_id
 */
async function getDefsByName(brand_id) {
  const def_ids = await getForBrand(brand_id)
  const defs = await getAll(def_ids)

  return defs.reduce((idx, def) => {
    idx.set(def.name, def.id)
    return idx
  }, /** @type {Map<string, UUID>} */(new Map))
}

/**
 * @param {UUID} brand_id
 */
async function getDefsById(brand_id) {
  const def_ids = await getForBrand(brand_id)
  const defs = await getAll(def_ids)

  return defs.reduce((idx, def) => {
    idx.set(def.name, def)
    return idx
  }, /** @type {Map<string, IContactAttributeDef>} */(new Map))
}

/**
 * @param {('number' | 'text' | 'date')} dataType
 * @returns {Promise<IContactAttributeDef[]>}
 */
async function getGlobalDefsNamesByDataType (dataType) {
  const rows = await db.select(
    'contact/attribute_def/global_defs_names_by_data_type',
    [dataType]
  )

  return rows.map(r => r.name)
}

module.exports = {
  get,
  getAll,
  getDefsById,
  getDefsByName,
  getGlobalDefs,
  getForBrand,
  getGlobalDefsNamesByDataType,
}
