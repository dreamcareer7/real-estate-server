const config  = require('../../../config')
const db      = require('../../../utils/db.js')

const Context = require('../../Context')
const Job     = require('../../Job')

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

      const job = Job.queue.create('microsoft_sync', data).removeOnComplete(true)
      Context.get('jobs').push(job)
    }

    return ids
  },

  syncMicrosoft
}

module.exports = MicrosoftWorker