const { strict: assert } = require('assert')

const { str, insert } = require('../../../utils/squel_extensions')
const { mapKey, validateKeyValue } = require('./utils')
const db = require('../../../utils/db')

/** @typedef {string} SettingKey */
/** @typedef {any} SettingValue */

/**
 * @param {IUser['id']} user_id
 * @param {IBrand['id']} brand_id
 * @param {SettingKey} key
 * @param {SettingValue} value
 */
const update = async (user_id, brand_id, key, value) => {
  key = mapKey.forDatabase(key)
  validateKeyValue(key, value)

  const value_json = str('?::json', JSON.stringify(value))
  const key_quoted = `"${key}"`
  
  const upsert_query = insert()
    .into('users_settings')
    .setFields({
      [key_quoted]: value_json,
      brand: brand_id,
      user: user_id,
    })
    .onConflict('"user", brand', {
      [key_quoted]: value_json,
      updated_at: str('now()'),
    })

  Object.assign(upsert_query, { name: 'user/settings/upsert' })

  const affected = await db.update(upsert_query)
  assert.equal(affected, 1, `upsert query affected ${affected} rows`)
}

module.exports = {
  update
}
