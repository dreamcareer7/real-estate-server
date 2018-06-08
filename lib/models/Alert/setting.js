const TYPE_NAME = 'user_alert_setting'
const TABLE_NAME = TYPE_NAME + 's'
const COLUMN_NAME = 'alert'
const STATUS_ALLOWED_VALUES = ['AlertOpenHouse', 'AlertStatusChange', 'AlertPriceDrop', 'AlertHit']
const notifSetting = new (require('../NotificationSettingHelper'))(TABLE_NAME, 
  TYPE_NAME, 
  COLUMN_NAME,
  STATUS_ALLOWED_VALUES)

const UserAlertSetting = {
  async getAll(ids) {
    return notifSetting.getAll(ids)
  },

  async update(userID, alertID, status) {
    return notifSetting.update(userID, alertID, status)
  }

}

Orm.register('user_alert_setting', 'UserAlertSetting', UserAlertSetting)

module.exports = UserAlertSetting