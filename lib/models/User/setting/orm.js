const Orm = require('../../Orm/registry')
const { getAll } = require('./get')
const { mapKey } = require('./utils')

/**
 * @param {import('./types').UserSetting} userSetting 
 */
function publicize (userSetting) {
  for (const [key, val] of Object.entries(userSetting)) {
    const mappedKey = mapKey.forClient(key)
    if (mappedKey === key) { continue }

    userSetting[mappedKey] = val
    delete userSetting[key]
  }
}

Orm.register('user_setting', 'UserSetting', { getAll, publicize })
