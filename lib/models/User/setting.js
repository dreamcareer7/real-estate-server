const db = require('../../utils/db')
const Orm = require('../Orm')

const UserSettings = {
  async update(user_id, brand_id, key, value) {
    return db.select('user/settings/update', [
      user_id,
      brand_id,
      key,
      JSON.stringify(value)
    ])
  }
}

Orm.register('user_setting', 'UserSettings', UserSettings)

module.exports = UserSettings
