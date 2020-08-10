/**
 * @namespace UserAlertSetting
 */


const UserAlertSetting = {
  ...require('./get'),
  ...require('./upsert')
}


module.exports = UserAlertSetting