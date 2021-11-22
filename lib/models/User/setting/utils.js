const { strict: assert } = require('assert')
const isString = require('lodash/isString')
const has = require('lodash/has')

const { str } = require('../../../utils/squel_extensions')
const validateCb = require('../../../utils/validator')
const promisify = require('../../../utils/promisify')

/** @typedef {string} SettingKey */
/** @typedef {any} SettingValue */
/** @typedef {import('@rechat/squel').FunctionBlock} FunctionBlock */

const validate = promisify(validateCb)

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
 * @param {SettingKey} key - setting key (must be mapped for database)
 * @param {SettingValue} value
 */
async function validateKeyValue (key, value) {
  assert(typeof key === 'string' && key.length, 'key must be a non-empty string')

  switch (key) {
    case 'grid_deals_agent_network_sort_field':
    case 'import_tooltip_visited':      
    case 'mls_sort_field':
    case 'grid_deals_sort_field':
    case 'grid_contacts_sort_field':
    case 'contact_view_mode_field':
    case 'grid_deals_sort_field_bo':
    case 'insight_layout_sort_field':
      return validate({ type: ['null', 'string'] }, value)
      
    case 'mls_saved_search_hint_dismissed':
    case 'onboarding_marketing_center':
      return validate({ type: ['null', 'integer'] }, value)
      
    case 'user_filter':
      return validate({ type: ['null', 'array'] }, value)
      
    case 'mls_last_browsing_location':
    case 'deals_grid_filter_settings':
      return validate({ type: ['null', 'object'] }, value)
      
    case 'super_campaign_admin_permission':
      return validate({ type: 'boolean' }, value)
      
    default:
      assert.fail(`Invalid settings key: ${key}`)
  }
}

/**
 * @param {SettingKey} key
 * @param {SettingValue} value
 * @returns {FunctionBlock} 
 */
function sqlExpressionFor (key, value) {
  switch (key) {
    case 'grid_deals_agent_network_sort_field':
    case 'import_tooltip_visited':      
    case 'mls_sort_field':
    case 'grid_deals_sort_field':
    case 'grid_contacts_sort_field':
    case 'contact_view_mode_field':
    case 'grid_deals_sort_field_bo':
    case 'insight_layout_sort_field':
      return str('?::text', String(value))
      
    case 'mls_saved_search_hint_dismissed':
    case 'onboarding_marketing_center':
      return str('?::int', Number(value))
      
    case 'user_filter':
    case 'mls_last_browsing_location':
    case 'deals_grid_filter_settings':      
      return str('?::json', JSON.stringify(value))
      
    case 'super_campaign_admin_permission':
      return str('?::boolean', Boolean(value))
      
    default:
      assert.fail(`Invalid settings key: ${key}`)
  }
}

module.exports = {
  mapKey,
  validateKeyValue,
  sqlExpressionFor,
}
