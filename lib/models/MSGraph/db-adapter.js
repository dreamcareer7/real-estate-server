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
  data.forEach(x => {
    try {
      x.source_types = importSourceData
      x.stages = defaultStage
      saveContactForUser(userID, {
        type: 'contact',
        attributes: x
      })
    } catch (e) {
      console.log('Error while saving imported contact data into DB')
    }
    console.log('Done saving imported contact data into DB')
  })

}

async function saveContactForUser(userID, contact) {
  return Contact.add(userID, contact, {
    get: false,
    activity: false,
    relax: true
  })
}

async function getCurrentMSGraphContacts(userID) {
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