const promisify = require('util').promisify

const IMPORTED_FROM_OUTLOOK = 'External/Outlook'
const importSourceData = [{
  type: 'source_type',
  source_type: IMPORTED_FROM_OUTLOOK
}]
const defaultStage = [{
  type: 'stage',
  stage: 'General'
}]

async function saveContacts(userID, data) {
  const contacts = data.map(d => ({
    type: 'contact',
    attributes: Object.assign({source_types: importSourceData, stages: defaultStage}, d)
  }))
  return Contact.addBulk(userID, contacts)
}

function getCurrentMSGraphContacts(userID) {
  return Contact.getByAttribute(userID, 'source_type', [IMPORTED_FROM_OUTLOOK], true)
}

async function updateContactForUser(userID, contactProps) {
  const promises = []
  contactProps.forEach(x => {
    promises.push(promisify(Contact.patchAttribute)(x.contactID, userID, x.id, x.name, x.value))
  })
  return Promise.all(promises.map(p => p.catch(e => e.toString())))

}

async function addAttributeToContactForUser(userID, contactProps) {
  const promises = []
  contactProps.forEach(x => {
    promises.push(promisify(Contact.addAttribute)(x.contactID, userID, x.value))
  })
  return Promise.all(promises.map(p => p.catch(e => e.toString())))
}

module.exports = {
  saveContacts,
  getCurrentMSGraphContacts,
  updateContactForUser,
  addAttributeToContactForUser
}