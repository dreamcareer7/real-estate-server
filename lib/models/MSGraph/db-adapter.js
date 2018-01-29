require('../../../scripts/connection')
require('../../../lib/utils/db')

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
    Contact.patchAttribute(x.id, userID, x.propID, x.prop, {type: x.prop, [x.prop]: x.value}, (err, res) => {
      if (err) {
        return console.log('Error updating attribute ', x.prop, ' with id', x.id)
      }
      console.log('Attributes updated successfully', x.prop)
    })
  })

}

async function addAttributeToContactForUser(userID, contactProps) {
  contactProps.forEach(x => {
    Contact.addAttribute(x.id, userID, x.prop, {type: x.prop, [x.prop]: x.value}, (err, res) => {
      if (err) {
        return console.log('Error Adding attribute ', x.prop, ' for user id', userID)
      }
      console.log('Attributes added successfully', x.prop)
    })
  })
}

module.exports = {
  saveContacts,
  getCurrentMSGraphContacts,
  updateContactForUser,
  addAttributeToContactForUser
}