const Orm = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('user_setting', 'UserSetting', { getAll })
