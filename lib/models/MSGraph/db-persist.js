require('../../../scripts/connection')
require('../../../lib/utils/db')
const IMPORTED_FROM_OUTLOOK = 'External/Outlook'
const importSourceData = [{
  type: 'source_type',
  source_type: IMPORTED_FROM_OUTLOOK
}]


// TODO-JAVAD: Use promise to make this function async
async function saveContacts(userID, data) {
  data.forEach(x => {
    x.source_types = importSourceData
    saveContactForUser(userID, {
      type: 'contact',
      attributes: x
    })
  })
}

function saveContactForUser(userID, contact) {
  Contact.add(userID, contact, (err, result) => {
    if (err) {
      return console.log('Error saving Outlook contact into DB: ', err)
    }
    console.log('Saving Outlook contact into DB is done.')
  })
}

async function getCurrentMSGraphContacts(userID) {

  return Contact.getByAttribute(userID,)
}

module.exports = {
  saveContacts
}