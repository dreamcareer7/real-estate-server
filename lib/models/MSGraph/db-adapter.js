const IMPORTED_FROM_OUTLOOK = 'External/Outlook'
const importSourceData = [{
  type: 'source_type',
  source_type: IMPORTED_FROM_OUTLOOK
}]
const defaultStage = [{
  type: 'stage',
  stage: 'General'
}]


// TODO-JAVAD: Use promise to make this function async
async function saveContacts(userID, data) {
  const promises = []
  data.forEach(x => {
    x.source_types = importSourceData
    x.stages = defaultStage
    promises.push(saveContactForUser(userID, {
      type: 'contact',
      attributes: x
    }))
  })
  return Promise.all(promises.map(p => p.catch(e => e.toString())))
}

async function saveContactForUser(userID, contact) {
  return await Contact.add(userID, contact, {
    get: false,
    activity: false,
    relax: true
  })
}

function getCurrentMSGraphContacts(userID) {
  return Contact.getByAttribute(userID, 'source_type', [IMPORTED_FROM_OUTLOOK])
}

async function updateContactForUser(userID, contactProps) {
  contactProps.forEach(x => {
    Contact.patchAttribute(x.contactID, userID, x.id, x.name, x.value, (err, res) => {
      if (err) {
        return console.log('Error updating attribute ', x.name, ' with id', x.id)
      }
      console.log('Attributes updated successfully', x.name)
    })
  })

}

async function addAttributeToContactForUser(userID, contactProps) {
  contactProps.forEach(x => {
    Contact.addAttribute(x.contactID, userID, x.value, (err, res) => {
      if (err) {
        return console.log('Error Adding attribute ', x.name, ' for user id', userID)
      }
      console.log('Attributes added successfully', x.name)
    })
  })
}

module.exports = {
  saveContacts,
  getCurrentMSGraphContacts,
  updateContactForUser,
  addAttributeToContactForUser
}