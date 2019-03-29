const AttributeDef = require('../../Contact/attribute_def')
const BrandRole = require('../../Brand/role')
const BrandContext = require('../../Brand/context')
const NotificationSetting = require('../notification')

async function set_default_notification_settings(job) {
  const { role, user } = job.data
  const { brand } = await BrandRole.get(role)

  const contexts = await BrandContext.getByBrand(brand)
  const def_ids = await AttributeDef.getGlobalDefs()
  const defs = await AttributeDef.getAll(def_ids)

  /** @type {ICalendarGlobalNotificationSettingInput[]} */
  const settings = contexts.map(c => ({
    object_type: 'deal_context',
    event_type: c.key,
    reminder: 1 * 24 * 3600
  })).concat(defs.map(a => ({
    object_type: 'contact_attribute',
    event_type: a.name,
    reminder: 1 * 24 * 3600
  })))

  await NotificationSetting.setGlobalSettings(settings, user, brand)
}

module.exports = {
  set_default_notification_settings
}
