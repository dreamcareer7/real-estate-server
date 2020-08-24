const db    = require('../../utils/db.js')
const squel = require('../../utils/squel_extensions')



const insert = async (records) => {
  if (records.length === 0)
    return []

  return db.select('calendar_integration/insert', [JSON.stringify(records)])
}

const gupsert = async (records) => {
  if (records.length === 0)
    return []

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('calendar_integration', 'cali')
      .set('etag = uv.etag')
      .set('local_etag = uv.etag')
      .set('crm_task = COALESCE(uv.crm_task::uuid, cali.crm_task::uuid)')
      .set('deleted_at = null')
      .from('update_values', 'uv')
      .where('cali.google_id = uv.google_id::uuid')

    q.name = 'calendar_integration/gupsert'

    return db.update(q, [])
  })  
}

const mupsert = async (records) => {
  if (records.length === 0)
    return []

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('calendar_integration', 'cali')
      .set('etag = uv.etag')
      .set('local_etag = uv.etag')
      .set('crm_task = COALESCE(uv.crm_task::uuid, cali.crm_task::uuid)')
      .set('deleted_at = null')
      .from('update_values', 'uv')
      .where('cali.microsoft_id = uv.microsoft_id::uuid')

    q.name = 'calendar_integration/mupsert'

    return db.update(q, [])
  })  
}


module.exports = {
  insert,
  gupsert,
  mupsert
}