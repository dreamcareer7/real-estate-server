const { enqueueJob } = require('../../../utils/worker')

const Contact = require('../../Contact')
const ContactList = require('../../Contact/list')
const CrmAssociation = require('../Association')
const CrmTask = require('../Task')

function updateContactNextTouch(contacts) {
  enqueueJob('touches', 'update_next_touch', { contacts })
}

/**
 * @param {Array<{created_by: UUID; id: UUID;}>} associations 
 */
function updateTouchTimesForContactAssociation(associations) {
  enqueueJob('touches', 'update_touch_times_for_contact_associations', { associations })
}

function updateTouchTimesAfterAssociationDelete(associations) {
  const contacts = associations.filter(a => a.contact && a.crm_task).map(a => a.contact)

  if (contacts.length > 0) {
    enqueueJob('touches', 'update_touch_times_for_contacts', { contacts })
  }
}

function updateContactNextTouchForList(list_id) {
  enqueueJob('touches', 'update_next_touch_for_list_members', { list_id })
}

function updateContactTouchTimesForTask({ task_id }) {
  enqueueJob('touches', 'update_touch_times_for_task', { task_id })
}

function onTaskDelete({ task }) {
  enqueueJob('touches', 'update_touch_times_for_contacts', { contacts: task.contacts })
  updateContactTouchTimesForTask({ task_id: task.id })
}

function onUpdateContactsBrand({ contact_ids }) {
  enqueueJob('touches', 'update_touch_times_for_contacts', { contacts: contact_ids })
}

module.exports = function attachEventHandlers() {
  ContactList.on('update', updateContactNextTouchForList)

  CrmAssociation.on('create', updateTouchTimesForContactAssociation)
  CrmAssociation.on('delete', updateTouchTimesAfterAssociationDelete)

  CrmTask.on('update', updateContactTouchTimesForTask)
  CrmTask.on('delete', onTaskDelete)

  Contact.on('update:brand', onUpdateContactsBrand)
  Contact.on('list:join', updateContactNextTouch)
  Contact.on('list:leave', updateContactNextTouch)
}
