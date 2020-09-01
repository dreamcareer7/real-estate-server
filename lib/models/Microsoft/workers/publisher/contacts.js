const { peanar } = require('../../../../utils/peanar')

const { syncContacts } = require('../job_contacts')
const { handleNotifications } = require('../job_contacts_notif')


module.exports = {
  syncContacts: peanar.job({
    handler: syncContacts,
    name: 'syncMicrosoftContacts',
    queue: 'microsoft_contacts',
    exchange: 'microsoft'
  }),

  pushEvent: peanar.job({
    handler: handleNotifications,
    name: 'microsoftCalNotification',
    queue: 'microsoft_contacts_notifications',
    exchange: 'microsoft'
  })
}