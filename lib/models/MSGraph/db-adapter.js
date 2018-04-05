const promisify = require('util').promisify
const _ = require('lodash')

const Contact = require('../Contact/index')
const ContactAttribute = require('../Contact/attribute')
const ContactAttributeDef = require('../Contact/attribute_def')

const IMPORTED_FROM_OUTLOOK = 'External/Outlook'

/**
 * Fetches attribute defs for a user
 * @param {UUID} userID 
 * @returns {Promise<Record<string, IContactAttributeDef>>}
 */
async function loadAttributeDefs(userID) {
  const def_ids = await ContactAttributeDef.getForUser(userID)
  const defs = await ContactAttributeDef.getAll(def_ids)
  return _.keyBy(defs, 'name')
}

async function saveContacts(userID, data) {
  const defs_by_name = await loadAttributeDefs(userID)
  const system_attributes = [{
    attribute_def: defs_by_name['source_type'],
    text: IMPORTED_FROM_OUTLOOK
  }, {
    attribute_def: defs_by_name['stage'],
    text: 'General'
  }]

  const contacts = data.map(d => ({
    attributes: system_attributes.concat(d)
  }))
  return Contact.create(userID, contacts, {
    activity: false,
    get: false,
    relax: true
  })
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