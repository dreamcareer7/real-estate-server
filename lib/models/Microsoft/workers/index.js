const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const MicrosoftCredential = require('../credential')
const { syncMicrosoft, handleMessageNotif } = require('./job')


const MicrosoftWorker = {
  syncDue: async () => {
    const rows = await db.select('microsoft/credential/outlook_sync_due', [config.microsoft_sync.gap_hour])
    const ids  = rows.map(r => r.id)

    const microsoftCredentials = await MicrosoftCredential.getAll(ids)

    for (const microsoftCredential of microsoftCredentials) {

      if ( microsoftCredential.sync_status !== 'pending' ) {
        await MicrosoftCredential.updateSyncStatus(microsoftCredential.id, 'pending')
      }

      const data = {
        action: 'microsoft_sync',
        microsoftCredential
      }

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
