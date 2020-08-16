const Message = require('../../../lib/models/Message/email')
const Notification = require('../../../lib/models/Notification/send')
const promisify = require('../../../lib/utils/promisify')

const { poll } = require('../poll')
require('./entrypoint')

const notifications = async () => {
  /*
   * These two need to run in this specific order.
   * Otherwise, we might send email messages before push notifications.
   */
  await Notification.sendForUnread()
  await promisify(Message.sendEmailForUnread)()
}

poll({
  fn: notifications,
  name: 'Notifications'
})
