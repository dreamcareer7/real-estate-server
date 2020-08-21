const TYPE_NAME      = 'user_listing_notification_setting'
const TABLE_NAME     = TYPE_NAME + 's'
const COLUMN_NAME    = 'listing'
const ALLOWED_VALUES = ['ListingStatusChange', 'ListingPriceDrop', 'ListingOpenHouse']
const notifSetting   = new (require('../../NotificationSettingHelper'))(TABLE_NAME, TYPE_NAME, COLUMN_NAME, ALLOWED_VALUES)


const getAll = async (ids) => {
  return notifSetting.getAll(ids)
}

const update = async (userID, listingID, status) => {
  return notifSetting.update(userID, listingID, status)
}

const getUsersWithStatus = async (typeIDs, status) => {
  return notifSetting.getUsersWithStatus(typeIDs, status)
}


module.exports = {
  getAll,
  update,
  getUsersWithStatus
}