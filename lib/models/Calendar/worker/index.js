const { peanar } = require('../../../utils/peanar')

const AttributeDef = require('../../Contact/attribute_def/get')
const BrandRole = require('../../Brand/role/get')
const BrandContext = require('../../Brand/deal/context')
const NotificationSetting = require('../notification')

async function set_default_notification_settings({ role, user }) {
  const { brand } = await BrandRole.get(role)

  const contexts = await BrandContext.getByBrand(brand)
  const def_ids = await AttributeDef.getGlobalDefs()
  const defs = await AttributeDef.getAll(def_ids)

  /** @type {ICalendarGlobalNotificationSettingInput[]} */
  const settings = contexts.filter(c => c.data_type === 'Date').map(c => ({
    object_type: 'deal_context',
    event_type: c.key,
    reminder: 1 * 24 * 3600
  })).concat(defs.filter(a => a.data_type === 'date' && a.name !== 'last_modified_on_source').map(a => ({
    object_type: (a.name !== 'home_anniversary') ? 'contact_attribute' : null,
    event_type: a.name,
    reminder: 1 * 24 * 3600
  })))

  await NotificationSetting.setGlobalSettings(settings, user, brand)
}

module.exports = {
  set_default_notification_settings: peanar.job({
    handler: set_default_notification_settings,
    queue: 'calendar',
    exchange: 'calendar',
    name: 'set_default_notification_settings',
    max_retries: 10,
    retry_exchange: 'calendar_retry',
    error_exchange: 'calendar_error'
  })
}
