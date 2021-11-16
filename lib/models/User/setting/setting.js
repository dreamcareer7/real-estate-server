const { strict: assert } = require('assert')

const { str, insert } = require('../../../utils/squel_extensions')
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
      deleted_at: null,
      updated_at: str('now()'),
    })

  Object.assign(upsert_query, { name: 'user/settings/upsert' })

  const affected = await db.update(upsert_query)
  assert.equal(affected, 1, `upsert query affected ${affected} rows`)
}

/**
 * @param {SettingKey} key
 * @param {SettingValue} value
 */
function validateKeyValue (key, value) {
  assert(typeof key === 'string' && key.length, 'key must be a non-empty string')
  
  switch (key) {
    case 'grid_deals_agent_network_sort_field':
    case 'mls-saved-search-hint-dismissed':
    case 'import_tooltip_visited':
    case 'mls_sort_field':
    case 'grid_deals_sort_field':
    case 'grid_contacts_sort_field':
    case 'user_filter':
    case 'mls_last_browsing_location':
    case 'onboarding__marketing-center':
    case 'contact_view_mode_field':
    case 'grid_deals_sort_field_bo':
    case 'insight_layout_sort_field':
    case 'deals_grid_filter_settings':
      return
      
    case 'super_campaign_admin_permission':
      assert.equal(typeof value, 'boolean', `${key} value must be a boolean`)
      return

    default:
      throw Error.Validation(`Invalid settings key: ${key}`)
  }
}

module.exports = {
  update
}
