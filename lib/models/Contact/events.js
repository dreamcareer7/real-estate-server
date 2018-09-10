const { enqueueJob } = require('../../utils/worker')

const Contact = require('./index')
const Attribute = require('./attribute')
const AttributeDef = require('./attribute_def')
const ContactList = require('./list')
const User = require('../User')

/**
 * Called when contacts are created
 */
function onCreateContacts(e) {
  enqueueJob('contact_lists', 'update_contact_memberships', { contact_ids: e.contact_ids })
  enqueueJob('contact_duplicates', 'add_vertices', { user_id: e.user_id, contact_ids: e.contact_ids })
  enqueueJob('contacts', 'update_display_names', { contact_ids: e.contact_ids })
  enqueueJob('contacts', 'create_contact_summary', { contact_ids: e.contact_ids })
}

/**
 * Called when contacts are created
 */
function onUpdateContacts(e) {
  enqueueJob('contact_lists', 'update_contact_memberships', { contact_ids: e.contact_ids })
  enqueueJob('contacts', 'update_display_names', { contact_ids: e.contact_ids })
  enqueueJob('contacts', 'update_contact_summary', { contact_ids: e.contact_ids })

  if (e.event_type !== 'merge') {
    enqueueJob('contact_duplicates', 'update_edges', { user_id: e.user_id, contact_ids: e.contact_ids })
  }
}

/**
 * Called when contacts are deleted
 */
function onDeleteContacts(e) {
  enqueueJob('contact_lists', 'delete_contact_memberships', { contact_ids: e.contact_ids })
  enqueueJob('contacts', 'delete_contact_summary', { contact_ids: e.contact_ids })

  if (e.event_type !== 'merge') {
    enqueueJob('contact_duplicates', 'remove_vertices', { contact_ids: e.contact_ids })
  }
}

/**
 * Called when a contact list is created
 */
function onListCreated(list_id) {
  enqueueJob('contact_lists', 'update_list_memberships', { list_id })
}

/**
 * Called when a contact list is updated
 */
function onListUpdated(list_id) {
  enqueueJob('contact_lists', 'update_list_memberships', { list_id })
}

/**
 * Called when a contact list is deleted
 */
function onListDeleted(list_id) {
  enqueueJob('contact_lists', 'delete_list_memberships', { list_id })
}

function onDeleteAttribute({ attribute_ids, affected_contacts }) {
  Contact.emit('update', {
    contact_ids: affected_contacts,
    event_type: 'delete_attribute'
  })
}

function onDeleteAttributeDef({ id, affected_contacts }) {
  Contact.emit('update', {
    contact_ids: affected_contacts,
    event_type: 'delete_attribute_def'
  })
}

function createDefaultListsOnUserUpgrade(user_id) {
  enqueueJob('contact_lists', 'create_default_lists', { user_id })
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
