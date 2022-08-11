const { peanar } = require('../../../../../utils/peanar')

const { handleNotifications } = require('../../job_outlook_notif')


module.exports = {
  pushEvent: peanar.job({
    handler: handleNotifications,
    name: 'microsoftNotification',
    queue: 'microsoft_notifications',
    exchange: 'microsoft',
    context: false
  })
}
