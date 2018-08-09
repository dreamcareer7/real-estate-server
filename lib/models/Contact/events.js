const { enqueueJob } = require('../../utils/worker')

const Contact = require('./index')
const Attribute = require('./attribute')
const AttributeDef = require('./attribute_def')
const ContactList = require('./list')
const User = require('../User')

/**
 * Called when contacts are created
 */
function onCreateContacts(contact_ids) {
  enqueueJob('contact_data_pipeline', 'update_contact_memberships', { contact_ids })
}

/**
 * Called when contacts are created
 */
function onUpdateContacts(contact_ids) {
  enqueueJob('contact_data_pipeline', 'update_contact_memberships', { contact_ids })
}

/**
 * Called when contacts are deleted
 */
function onDeleteContacts(contact_ids) {
  enqueueJob('contact_data_pipeline', 'delete_contact_memberships', { contact_ids })
}

/**
 * Called when a contact list is created
 */
function onListCreated(list_id) {
  enqueueJob('contact_data_pipeline', 'update_list_memberships', { list_id })
}

/**
 * Called when a contact list is updated
 */
function onListUpdated(list_id) {
  enqueueJob('contact_data_pipeline', 'update_list_memberships', { list_id })
}

/**
 * Called when a contact list is deleted
 */
function onListDeleted(list_id) {
  enqueueJob('contact_data_pipeline', 'delete_list_memberships', { list_id })
}

function onDeleteAttribute({ attribute_ids, affected_contacts }) {
  Contact.emit('update', affected_contacts)
}

function onDeleteAttributeDef({ id, affected_contacts }) {
  Contact.emit('update', affected_contacts)
}

function createDefaultListsOnUserUpgrade(user_id) {
  enqueueJob('contact_data_pipeline', 'create_default_lists', { user_id })
}

module.exports = function attachEventHandlers() {
  Contact.on('create', onCreateContacts)
  Contact.on('update', onUpdateContacts)
  Contact.on('delete', onDeleteContacts)

  Attribute.on('delete', onDeleteAttribute)
  
  AttributeDef.on('delete', onDeleteAttributeDef)

  ContactList.on('create', onListCreated)
  ContactList.on('update', onListUpdated)
  ContactList.on('delete', onListDeleted)

  User.on('upgrade', createDefaultListsOnUserUpgrade)
}