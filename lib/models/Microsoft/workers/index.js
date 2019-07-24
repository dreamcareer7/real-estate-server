const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const MicrosoftCredential = require('../credential')
const { syncMicrosoft } = require('./job')


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

  syncMicrosoft: peanar.job(syncMicrosoft, {
    name: 'syncMicrosoft',
    queue: 'microsoft',
    exchange: 'microsoft'
  })
}

module.exports = MicrosoftWorker