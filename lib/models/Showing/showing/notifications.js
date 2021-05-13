const db = require('../../../utils/db')
const promisify = require('../../../utils/promisify')
const Notification = require('../../Notification/get')

/**
 * Get all unread showing notifications for a user
 * @param {UUID} user
 * @param {{ limit?: number; }} options
 */
async function getUnreadNotifications(user, options) {
  const results = await db.select('showing/showing/notifications', [user, options.limit || 100])
  const ids = results.map(r => r.id)
  const notifications = await promisify(Notification.getAll)(ids)
  notifications[0].total = results[0].total
  return notifications
}

module.exports = {
  getUnreadNotifications,
}
