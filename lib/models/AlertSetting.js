const db = require('../utils/db.js')
const Orm = require('./Orm')
const ObjectUtil = require('./ObjectUtil')

class AlertSetting {
  static async getAll(alertIDs) {
    // TODO: (Javad) Fix this if we don't need it anymore
    // const userID = ObjectUtil.getCurrentUser()
    const res = await db.select('alert/get_alert_status_for_user', [alertIDs])
    return res
  }
}

Orm.register('alert_setting', 'AlertSetting', AlertSetting)

module.exports = AlertSetting