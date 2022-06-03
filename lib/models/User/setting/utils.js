const isPlainObject = require('lodash/isPlainObject')
const isBoolean = require('lodash/isBoolean')
const isString = require('lodash/isString')
const isNull = require('lodash/isNull')
const has = require('lodash/has')

const { str } = require('../../../utils/squel_extensions')

/** @typedef {import('@rechat/squel').FunctionBlock} FunctionBlock */
/** @typedef {import('./types').UserSettingFields} UserSettingFields */
/** @typedef {import('./types').ClientSettingKey} ClientSettingKey */
/** @typedef {import('./types').UserSetting} UserSetting */
/** @typedef {import('./types').SettingKey} SettingKey */

const mapKey = {
  /** @type {{[k: SettingKey]: ClientSettingKey}} */
  MAPPING: {
    onboarding_marketing_center: 'onboarding__marketing-center',
  },
  
  /** @type {(k: SettingKey) => ClientSettingKey} */
  forClient: k => has(mapKey.MAPPING, k) ? mapKey.MAPPING[k] : k,

  /** @type {(k: ClientSettingKey) => SettingKey} */
  forDatabase: k => {
    return /** @type {SettingKey} */ (k?.replace?.(/[-_]+/g, '_')) ?? k
  },
}

/**
 * @template {SettingKey} K
 * @template {UserSettingFields[K]} V
 * @param {K} key - setting key (must be mapped for database)
 * @param {V} value
 */
function validateKeyValue (key, value) {
  if (!isString(key) || !key.length) {
    throw Error.Validation('key must be a non-empty string')
  }

  switch (key) {
    case 'grid_deals_agent_network_sort_field':
    case 'mls_sort_field':
    case 'grid_deals_sort_field':
    case 'grid_contacts_sort_field':
    case 'contact_view_mode_field':
    case 'grid_deals_sort_field_bo':
      if (isNull(value) || isString(value)) { return }
      throw Error.Validation(`${key} must be a string or null`)
      
    case 'onboarding_marketing_center':
      if (isNull(value) || Number.isSafeInteger(value)) { return }
      throw Error.Validation(`${key} must be a safe integer or null`)
      
    case 'user_filter':
      if (isNull(value) || Array.isArray(value)) { return }
      throw Error.Validation(`${key} must be an array or null`)
      
    case 'mls_last_browsing_location':
    case 'deals_grid_filter_settings':
    case 'insight_layout_sort_field':
    case 'calendar_filters':
      if (isNull(value) || isPlainObject(value)) { return }
      throw Error.Validation(`${key} must be an object or null`)

    case 'listings_add_mls_account_reminder_dismissed':
    case 'mls_saved_search_hint_dismissed':
    case 'super_campaign_admin_permission':
    case 'import_tooltip_visited':
      if (isBoolean(value)) { return }
      throw Error.Validation(`${key} must be a boolean`)
      
    default:
      throw Error.Validation(`Invalid settings key: ${key}`)
  }
}

/**
 * @template {SettingKey} K
 * @template {UserSettingFields[K]} V
 * @param {K} key
 * @param {V} value
 * @returns {FunctionBlock} 
 */
function sqlExpressionFor (key, value) {
  if (value === null) {
    return str('NULL')
  }
  
  switch (key) {
    case 'grid_deals_agent_network_sort_field':
    case 'mls_sort_field':
    case 'grid_deals_sort_field':
    case 'grid_contacts_sort_field':
    case 'contact_view_mode_field':
    case 'grid_deals_sort_field_bo':
      return str('?::text', String(value))
      
    case 'onboarding_marketing_center':
      return str('?::int', Number(value))
      
    case 'user_filter':
    case 'mls_last_browsing_location':
    case 'deals_grid_filter_settings':
    case 'insight_layout_sort_field':
    case 'calendar_filters':
      return str('?::json', JSON.stringify(value))

    case 'listings_add_mls_account_reminder_dismissed':
    case 'mls_saved_search_hint_dismissed':      
    case 'super_campaign_admin_permission':
    case 'import_tooltip_visited':
      return str('?::boolean', Boolean(value))
      
    default:
      throw Error.Validation(`Invalid settings key: ${key}`)
  }
}

module.exports = {
  mapKey,
  validateKeyValue,
  sqlExpressionFor,
}
