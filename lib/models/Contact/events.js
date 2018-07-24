const { enqueueJob } = require('../../utils/worker')

const Job = require('../Job')
const Contact = require('./index')
const Attribute = require('./attribute')
const AttributeDef = require('./attribute_def')
const ContactList = require('./list')

/**
 * Called when contacts are created
 */
async function onCreateContacts(contact_ids) {
  enqueueJob('contact_data_pipeline', 'update_contact_memberships', { contact_ids })
}

/**
 * Called when contacts are created
 */
async function onUpdateContacts(contact_ids) {
  enqueueJob('contact_data_pipeline', 'update_contact_memberships', { contact_ids })
}

/**
 * Called when contacts are deleted
 */
async function onDeleteContacts(contact_ids) {
  enqueueJob('contact_data_pipeline', 'delete_contact_memberships', { contact_ids })
}

/**
 * Called when a contact list is created
 */
async function onListCreated(list_id) {
  enqueueJob('contact_data_pipeline', 'update_list_memberships', { list_id })
}

function onDeleteAttribute({ attribute_ids, affected_contacts }) {
  Contact.emit('update', affected_contacts)
}

function onDeleteAttributeDef({ id, affected_contacts }) {
  Contact.emit('update', affected_contacts)
}

module.exports = function attachEventHandlers() {
  Contact.on('create', onCreateContacts)
  Contact.on('update', onUpdateContacts)
  Contact.on('delete', onDeleteContacts)

  Attribute.on('delete', onDeleteAttribute)
  
  AttributeDef.on('delete', onDeleteAttributeDef)

  ContactList.on('create', onListCreated)
  ContactList.on('update', onListCreated)
}