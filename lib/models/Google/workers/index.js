const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const GoogleCredential = require('../credential')
const { syncGoogle }   = require('./job')

const GoogleWorker = {
  syncDue: async () => {
    const rows = await db.select('google/credential/sync_due', [config.google_sync.gap_hour])
    const ids  = rows.map(r => r.id)

    const googleCredentials = await GoogleCredential.getAll(ids)

    for (const googleCredential of googleCredentials) {

      if ( googleCredential.sync_status !== 'pending' ) {
        await GoogleCredential.updateSyncStatus(googleCredential.id, 'pending')
      }

      const data = {
        action: 'google_sync',
        googleCredential
      }

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
