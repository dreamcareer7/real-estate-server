const Message = require('../../../lib/models/Message/email')
const Notification = require('../../../lib/models/Notification/send')
const promisify = require('../../../lib/utils/promisify')

const { poll } = require('../utils/poll')

const notifications = async () => {
  /*
   * These two need to run in this specific order.
   * Otherwise, we might send email messages before push notifications.
   */
  await Notification.sendForUnread()
  await promisify(Message.sendEmailForUnread)()
}

function start() {
  poll({
    fn: notifications,
    name: 'Notifications',
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
