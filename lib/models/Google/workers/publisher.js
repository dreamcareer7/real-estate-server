const { peanar } = require('../../../utils/peanar')


module.exports = {
  Gmail: {
    syncGmail: (handler) => {
      return peanar.job({
        handler,
        name: 'syncGmail',
        queue: 'google',
        exchange: 'google'
      })
    },

    pushEvent: (handler) => {
      return peanar.job({
        handler,
        name: 'gmailWebhook',
        queue: 'gmail_webhooks',
        exchange: 'google'
      })
    }
  },

  Calendar: {  
    syncCalendar: (handler) => {
      return peanar.job({
        handler,
        name: 'syncGoogleCalendar',
        queue: 'google_cal',
        exchange: 'google'
      })
    },
  
    pushEvent: (handler) => {
      return peanar.job({
        handler,
        name: 'googleCalWebhook',
        queue: 'google_cal_webhooks',
        exchange: 'google'
      })
    }
  },
  
  Contacts: {
    syncContacts: (handler) => {
      return peanar.job({
        handler,
        name: 'syncGoogleContacts',
        queue: 'google_contacts',
        exchange: 'google'
      })
    }
  }
}