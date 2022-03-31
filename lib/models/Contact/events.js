const Attribute = require('./attribute/emitter')
const AttributeDef = require('./attribute_def/emitter')
const Brand = require('../Brand')
const Context = require('../Context')

const Contact = require('./emitter')
const ContactList = require('./list/emitter')
const CrmTask = require('../CRM/Task/emitter')
const Flow = require('../Flow/emitter')

const { create_default_tags, unpark_contacts } = require('./worker/contact')
const { add_vertices, remove_vertices, update_edges } = require('./worker/duplicate')
const {
  update_contact_memberships,
  update_list_memberships,
  
  delete_contact_memberships,
  delete_list_memberships,

  remove_crm_tasks_from_lists,
  remove_flow_from_lists,

  create_default_lists
} = require('./worker/list')

/**
 * Called when contacts are created
 */
function onCreateContacts({ brand_id, contact_ids }) {
  Context.log('contacts:events Contact:create event triggered')
  update_contact_memberships(contact_ids)
  add_vertices(brand_id, contact_ids)
}

/**
 * Called when contacts are created
 */
function onUpdateContacts({ event_type, user_id, brand_id, contact_ids, reason }) {
  update_contact_memberships(contact_ids)
  if (event_type !== 'merge') {
    update_edges(brand_id, contact_ids)

    if (reason === 'direct_request') {
      unpark_contacts(contact_ids, user_id, brand_id)
    }
  }
}

/**
 * Called when contacts are moved between brands
 */
function onUpdateContactsBrand({ brand_id, contact_ids }) {
  delete_contact_memberships(contact_ids)
  update_contact_memberships(contact_ids)

  remove_vertices(contact_ids)
  update_edges(brand_id, contact_ids)
}

/**
 * Called when contacts are deleted
 */
function onDeleteContacts({ event_type, contact_ids }) {
  delete_contact_memberships(contact_ids)

  if (event_type !== 'merge') {
    remove_vertices(contact_ids)
  }
}

/**
 * @param {IBrand} brand
 */
function onBrandCreated(brand) {
  const user = Context.get('user')
  const user_id = user ? user.id : null

  create_default_tags(user_id, brand.id)
  create_default_lists(brand.id)
}

/**
 * Called when a contact list is created
 * @param {UUID} list_id
 */
function onListCreated(list_id) {
  update_list_memberships(list_id)
}

/**
 * Called when a contact list is updated
 * @param {UUID} list_id
 */
function onListUpdated(list_id) {
  update_list_memberships(list_id)
}

/**
 * Called when a contact list is deleted
 * @param {UUID[]} list_ids
 */
function onListDeleted(list_ids) {
  delete_list_memberships(list_ids)
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

function onFlowStopped({ brand_id, flow_id }) {
  remove_flow_from_lists(brand_id, flow_id)
}

function onFlowCreated({ contacts, user_id, brand_id }) {
  unpark_contacts(contacts, user_id, brand_id)
}

/**
 * @deprecated Have a look at CrmAssociation.on('create:contact', onCrmAssociationCreated) on module.exports
 */
// function onCrmAssociationCreated(associations) {
//   const user_id = associations[0].created_by
//   const brand_id = associations[0].brand
//   const contacts = associations.map(a => a.contact)
//   // Associations are not guaranteed to have distinct contacts. so we .uniq() them.
//   unpark_contacts(_.uniq(contacts), user_id, brand_id)
// }

function onCrmTaskDeleted({ brand_id, task_ids }) {
  remove_crm_tasks_from_lists(brand_id, task_ids)
}

module.exports = function attachEventHandlers() {
  Contact.on('create', onCreateContacts)
  Contact.on('update', onUpdateContacts)
  Contact.on('update:brand', onUpdateContactsBrand)
  Contact.on('delete', onDeleteContacts)

  Attribute.on('delete', onDeleteAttribute)

  AttributeDef.on('delete', onDeleteAttributeDef)

  ContactList.on('create', onListCreated)
  ContactList.on('update', onListUpdated)
  ContactList.on('delete', onListDeleted)

  Flow.on('create', onFlowCreated)
  Flow.on('stop', onFlowStopped)
  CrmTask.on('delete', onCrmTaskDeleted)

  // (Amin) We decided to don't unpark the contacts due:
  // If new attendees are in an event from Google, those are not in use Rechat contacts, we are going to create them in the park.
  // So this method will unpark them which is not what we really want.
  // CrmAssociation.on('create:contact', onCrmAssociationCreated)

  Brand.on('create', onBrandCreated)
}
