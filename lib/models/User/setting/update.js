const { strict: assert } = require('assert')

const { str, insert } = require('../../../utils/squel_extensions')
const { mapKey, validateKeyValue, sqlExpressionFor } = require('./utils')
const db = require('../../../utils/db')

/** @typedef {import('./types').UserSettingFields} UserSettingFields */
/** @typedef {import('./types').ClientSettingKey} ClientSettingKey */

/**
 * @template {ClientSettingKey} K
 * @template V
 * @param {IUser['id']} user_id
 * @param {IBrand['id']} brand_id
 * @param {K} key
 * @param {V} value
 * @returns {Promise<[{ key: K, value: V }]>}
 */
const update = async (user_id, brand_id, key, value) => {
  const mapped_key = mapKey.forDatabase(key)
  validateKeyValue(mapped_key, value)
  
  const value_expr = sqlExpressionFor(mapped_key, value)
  
  const upsert_query = insert()
    .into('users_settings')
    .setFields({
      [mapped_key]: value_expr,
      brand: brand_id,
      '"user"': user_id,
    })
    .onConflict('"user", brand', {
      [mapped_key]: value_expr,
      updated_at: str('now()'),
    })

  Object.assign(upsert_query, { name: 'user/settings/upsert' })

  const affected = await db.update(upsert_query)
  assert.equal(affected, 1, `upsert query affected ${affected} rows`)

  return [{ key, value }]
}

module.exports = {
  update,
}
