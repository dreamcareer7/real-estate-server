require('../../../scripts/connection')
require('../../../lib/utils/db')

// TODO-JAVAD: Use promise to make this function async
async function saveContacts(userID, data) {
  data.forEach(x => {
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

module.exports = {
  saveContacts
}