const { peanar } = require('../../../utils/peanar')


module.exports = {
  Outlook: {
    syncOutlook: (handler) => {
      return peanar.job({
        handler,
        name: 'syncOutlook',
        queue: 'microsoft',
        exchange: 'microsoft'
      })
    },

    pushEvent: (handler) => {
      return peanar.job({
        handler,
        name: 'microsoftNotification',
        queue: 'microsoft_notifications',
        exchange: 'microsoft'
      })
    }
  },

  Calendar: {  
    syncCalendar: (handler) => {
      return peanar.job({
        handler,
        name: 'syncMicrosoftCalendar',
        queue: 'microsoft_cal',
        exchange: 'microsoft'
      })
    },
  
    pushEvent: (handler) => {
      return peanar.job({
        handler,
        name: 'microsoftCalNotification',
        queue: 'microsoft_cal_notifications',
        exchange: 'microsoft'
      })
    }
  },
  
  Contacts: {
    syncContacts: (handler) => {
      return peanar.job({
        handler,
        name: 'syncMicrosoftContacts',
        queue: 'microsoft_contacts',
        exchange: 'microsoft'
      })
    }
  },

  Disconnect: {
    credential: (handler) => {
      return peanar.job({
        handler,
        name: 'disconnectMicrosoft',
        queue: 'microsoft_disconnect',
        exchange: 'microsoft'
      })
    }
  }
}