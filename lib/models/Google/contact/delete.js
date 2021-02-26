const db    = require('../../../utils/db.js')
const squel = require('@rechat/squel').useFlavour('postgres')



/**
 * @param {UUID[]} ids
 */
const deleteMany = async function (ids) {
  await db.select('google/contact/delete', [ids])
}

/**
 * @param {UUID[]} ids
 */
const restoreMany = async function (ids) {
  await db.select('google/contact/restore', [ids])
}

/**
 * @param {Object} records
 */
const deleteManyCGroups = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('google_contact_groups', 'gcg')
      .set('deleted_at = now()')
      .from('update_values', 'uv')
      .where('gcg.google_credential = uv.google_credential::uuid')
      .where('gcg.resource_id = uv.resource_id::text')

    q.name = 'google_contact_groups/gupsert'

    return db.update(q, [])
  })  
}

/**
 * @param {UUID[]} ids
 */
const hardDelete = async function (ids) {
  await db.select('google/contact/hard_delete', [ids])
}


module.exports = {
  deleteMany,
  restoreMany,
  deleteManyCGroups,
  hardDelete
}