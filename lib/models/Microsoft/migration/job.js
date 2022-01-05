const _ = require('lodash')
const Context  = require('../../Context')
const { migrateContacts } = require('./publisher')
const { 
  getContactsWithoutNewId,
} = require('./model')

module.exports = {
  
  async migrationDue() {
    const records = await getContactsWithoutNewId()
    Context.log('microsoftContactsMigration - Fetched rows ', records.length)
    const groupedRecords = _.groupBy(records, 'cid')
    for(const key in groupedRecords) {
      const data = {
        cid: key,
        contacts: groupedRecords[key].map(x=> ({id: x.id, remote_id: x.remote_id})),
        action: 'migrate_contact'
      }
      migrateContacts(data)
    }
  },

}
