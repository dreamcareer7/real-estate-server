const Orm = require('../../Orm/registry')

const { getAll } = require('./get')


Orm.register('user_alert_setting', 'UserAlertSetting', {
  getAll
})