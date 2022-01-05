const { peanar } = require('../../../utils/peanar')

const { contactsMigration } = require('./worker')

module.exports = {
  migrateContacts: peanar.job({
    handler: contactsMigration,
    name: 'microsoftContactsMigration',
    queue: 'microsoft_migration',
    exchange: 'microsoft'
  })
}