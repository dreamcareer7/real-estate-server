const { peanar } = require('../../../../../utils/peanar')

const { handleNotifications } = require('../../job_cal_notif')


module.exports = {
  pushEvent: peanar.job({
    handler: handleNotifications,
    name: 'microsoftCalNotification',
    queue: 'microsoft_cal_notifications',
    exchange: 'microsoft'
  })
}