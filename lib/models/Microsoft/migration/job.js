const _ = require('lodash')
const { migrateContacts, migrateMessages } = require('./publisher')
const { 
  getContactsWithoutNewId,
  getMessagesWithoutNewId,
} = require('./model')

// eslint-disable-next-line no-unused-vars
async function createContactMigrationJob() {
  const records = await getContactsWithoutNewId()
  const groupedRecords = _.groupBy(records, 'cid')
  for(const key in groupedRecords) {
    const data = {
      cid: key,
      contacts: groupedRecords[key].map(x=> ({id: x.id, remote_id: x.remote_id})),
      action: 'migrate_contact'
    }
    migrateContacts(data)
  }
}

// eslint-disable-next-line no-unused-vars
async function createMessageMigrationJob() {
  const now = new Date()
  const nowHour = Number(now.getHours)
  if(now.getDay() < 5) {
    if(nowHour > 14 && nowHour < 23) { // Dallas 8 - 17 
      return
    }
  }
  const records = await getMessagesWithoutNewId()
  const groupedRecords = _.groupBy(records, 'cid')
  for(const key in groupedRecords) {
    const data = {
      cid: key,
      messages: groupedRecords[key].map(x=> ({id: x.id, message_id: x.message_id})),
      action: 'migrate_message'
    }
    migrateMessages(data)
  }
}
module.exports = {
  
  async migrationDue() {
    //// Contact section
    // await createContactMigrationJob()


    //// Message section
    // await createMessageMigrationJob()

  },

}
