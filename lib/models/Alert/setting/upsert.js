const TYPE_NAME   = 'user_alert_setting'
const TABLE_NAME  = TYPE_NAME + 's'
const COLUMN_NAME = 'alert'

const STATUS_ALLOWED_VALUES = ['AlertOpenHouse', 'AlertStatusChange', 'AlertPriceDrop', 'AlertHit']

const notifSetting = new (require('../../NotificationSettingHelper'))(TABLE_NAME, TYPE_NAME, COLUMN_NAME, STATUS_ALLOWED_VALUES)


const update = async (userID, alertID, status) => {
  return notifSetting.update(userID, alertID, status)
}

const filterUsersWithStatus = async (userIDs, alertIDs, status) => {
  return notifSetting.filterUsersWithStatus(userIDs, alertIDs, status)
}

const insert = async (userID, alertID) => {
  return notifSetting.update(userID, alertID, STATUS_ALLOWED_VALUES)
}


module.exports = {
  update,
  filterUsersWithStatus,
  insert
}