const { peanar } = require('../../../utils/peanar')

const { contactsMigration, messagesMigration } = require('./worker')

module.exports = {
  migrateContacts: peanar.job({
    handler: contactsMigration,
    name: 'microsoftContactsMigration',
    queue: 'microsoft_migration',
    exchange: 'microsoft'
  }),

  migrateMessages: peanar.job({
    handler: messagesMigration,
    name: 'microsoftMessagesMigration',
    queue: 'microsoft_migration',
    exchange: 'microsoft'
  }),
}
