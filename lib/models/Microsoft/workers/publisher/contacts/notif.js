const { peanar } = require('../../../../../utils/peanar')

const { handleNotifications } = require('../../job_contacts_notif')


module.exports = {
  pushEvent: peanar.job({
    handler: handleNotifications,
    name: 'microsoftCalNotification',
    queue: 'microsoft_contacts_notifications',
    exchange: 'microsoft'
  })
}