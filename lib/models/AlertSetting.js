const db = require('../utils/db.js')
const Orm = require('./Orm')
const ObjectUtil = require('./ObjectUtil')

class AlertSetting {
  static async getAll(alertIDs) {
    const userID = ObjectUtil.getCurrentUser()
    const res = await db.select('alert/get_alert_status_for_user', [userID, alertIDs])
    return res
  }
}

Orm.register('alert_setting', 'AlertSetting', AlertSetting)

module.exports = AlertSetting