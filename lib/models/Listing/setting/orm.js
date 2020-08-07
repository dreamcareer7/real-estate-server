const Orm = require('../../Orm/registry')

const { getAll } = require('./setting')

Orm.register('user_listing_notification_setting', 'UserListingNotificationSetting', {
  getAll
})