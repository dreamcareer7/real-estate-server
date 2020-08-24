const db     = require('../../../utils/db')
const squel  = require('../../../utils/squel_extensions')

/**
 * @param {UUID} id
 * @param {string} key
 */
const saveThreadKey = async (id, key) => {
  return db.update('email/campaign/save_thread_key', [id, key])
}

const saveThreadKeys = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('email_campaigns', 'ec')
      .set('thread_key = uv.thread_key')
      .from('update_values', 'uv')
      .where('ec.id = uv.id::uuid')

    q.name = 'email/campaign/save_thread_keys'

    return db.update(q, [])
  })  
}

module.exports = {
  saveThreadKey,
  saveThreadKeys,
}
