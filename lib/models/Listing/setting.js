const TYPE_NAME = 'user_listing_notification_setting'
const TABLE_NAME = TYPE_NAME + 's'
const COLUMN_NAME = 'listing'
const ALLOWED_VALUES = ['ListingStatusChange', 'ListingPriceDrop', 'ListingOpenHouse']
const notifSetting = new (require('../NotificationSettingHelper'))(TABLE_NAME, 
  TYPE_NAME, 
  COLUMN_NAME,
  ALLOWED_VALUES)

const UserListingNotificationSetting = {
  async getAll(ids) {
    return notifSetting.getAll(ids)
  },

  async update(userID, listingID, status) {
    return notifSetting.update(userID, listingID, status)
  }

}

Orm.register('user_listing_notification_setting', 'UserListingNotificationSetting', UserListingNotificationSetting)

module.exports = UserListingNotificationSetting