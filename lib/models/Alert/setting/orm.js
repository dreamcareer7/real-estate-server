const Orm = require('../../Orm/registry')

const { getAll } = require('./setting')


Orm.register('user_alert_setting', 'UserAlertSetting', {
  getAll
})