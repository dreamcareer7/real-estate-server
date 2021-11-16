const { strict: assert } = require('assert')
const isString = require('lodash/isString')
const has = require('lodash/has')

/** @typedef {string} SettingKey */
/** @typedef {any} SettingValue */

const mapKey = {
  MAPPING: {
    mls_saved_search_hint_dismissed: 'mls-saved-search-hint-dismissed',
    onboarding_marketing_center: 'onboarding__marketing-center',
  },
  
  /** @type {(k: SettingKey) => SettingKey} */
  forClient: k => has(mapKey.MAPPING, k) ? mapKey.MAPPING[k] : k,

  /** @type {(k: SettingKey) => SettingKey} */
  forDatabase: k => isString(k) ? k.replace(/[-_]+/g, '_') : k,
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
  mapKey,
  validateKeyValue,
}
