const config  = require('../../../config')
const db      = require('../../../utils/db.js')

const Context = require('../../Context')
const Job     = require('../../Job')

const GoogleCredential = require('../credential')
const { syncGoogle } = require('./job')

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

      await GoogleCredential.updateSyncStatus(googleCredential.id, 'pending')

      const job = Job.queue.create('google_sync', data).removeOnComplete(true).attempts(1)

      Context.get('jobs').push(job)
    }

    return ids
  },

  syncGoogle
}

module.exports = GoogleWorker
