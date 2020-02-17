const Calendar = require('./index')
const FeedSettings = require('./feed_settings')

/**
 * @typedef ISettingsFilter
 * @prop {number=} low
 * @prop {number=} high
 * @prop {number=} last_updated_gt
 *
 * @param {UUID} brand 
 * @param {UUID} user
 * @param {ISettingsFilter} query 
 */
async function filter(brand, user, query) {
  const settings = await FeedSettings.get(user)
  if (!settings) return []
  if (Array.isArray(settings.selected_types) && settings.selected_types.length === 0) {
    settings.selected_types = null
  }

  const setting_filter_applies_to_brand = settings.filter
    ? settings.filter.findIndex(f => f.brand === brand && (!f.users || f.users.includes(user))) > -1
    : false

  if (settings.filter && !setting_filter_applies_to_brand) return []

  return Calendar.filter([{ brand, users: [user] }], {
    ...query,
    event_types: settings.selected_types,
    object_types: ['contact_attribute', 'crm_task', 'deal_context']
  })
}

module.exports = {
  filter
}
