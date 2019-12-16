const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const MicrosoftCredential = require('../credential')
const { syncMicrosoft, handleMessageNotif } = require('./job')


const MicrosoftWorker = {
  syncDue: async () => {
    const rows = await db.select('microsoft/credential/sync_due', [config.microsoft_sync.gap_hour])
    const ids  = rows.map(r => r.id)

    for (const id of ids) {
      const microsoftCredential = await MicrosoftCredential.get(id)

      const data = {
        action: 'microsoft_sync',
        microsoftCredential: microsoftCredential
      }

      await MicrosoftCredential.updateSyncStatus(microsoftCredential.id, 'pending')

      MicrosoftWorker.syncMicrosoft(data)
    }

    return ids
  },

  syncMicrosoft: peanar.job({
    handler: syncMicrosoft,
    name: 'syncMicrosoft',
    queue: 'microsoft',
    exchange: 'microsoft'
  }),
  
  pushEvent: peanar.job({
    handler: handleMessageNotif,
    name: 'microsoftNotification',
    queue: 'microsoft_notifications',
    exchange: 'microsoft'
  })
}

module.exports = MicrosoftWorker
