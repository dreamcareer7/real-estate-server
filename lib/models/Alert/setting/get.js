const TYPE_NAME   = 'user_alert_setting'
const TABLE_NAME  = TYPE_NAME + 's'
const COLUMN_NAME = 'alert'

const STATUS_ALLOWED_VALUES = ['AlertOpenHouse', 'AlertStatusChange', 'AlertPriceDrop', 'AlertHit']

const notifSetting = new (require('../../NotificationSettingHelper'))(TABLE_NAME, TYPE_NAME, COLUMN_NAME, STATUS_ALLOWED_VALUES)


const getAll = async (ids) => {
  return notifSetting.getAll(ids)
}


module.exports = {
  getAll
}