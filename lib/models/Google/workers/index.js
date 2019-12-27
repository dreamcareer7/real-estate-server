const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const GoogleCredential = require('../credential')
const { syncGoogle }   = require('./job')

const GoogleWorker = {
  syncDue: async () => {
    const rows = await db.select('google/credential/sync_due', [config.google_sync.gap_hour])
    const ids  = rows.map(r => r.id)

    for (const id of ids) {
      const googleCredential = await GoogleCredential.get(id)

      const data = {
        action: 'google_sync',
        googleCredential: googleCredential
      }

      if ( googleCredential.sync_status !== 'pending' )
        await GoogleCredential.updateSyncStatus(googleCredential.id, 'pending')

      GoogleWorker.syncGoogle(data)
    }

    return ids
  },

  syncGoogle: peanar.job({
    handler: syncGoogle,
    name: 'syncGoogle',
    queue: 'google',
    exchange: 'google'
  })
}

module.exports = GoogleWorker
