require('../../../scripts/connection')
require('../../../lib/utils/db')
// require('../../../lib/models/index.js')


async function saveContacts(userID, data) {
  console.log(data)
}

function saveContactForUser(userID, contact) {
  Contact.add(userID, contact, (err, result) => {
    if (err) {
      console.log('something is wrong', err)
    }
    console.log('Saving done')
  })
}

module.exports = {
  saveContacts
}