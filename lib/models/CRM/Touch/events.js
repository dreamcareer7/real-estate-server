const {
  update_next_touch_for_list_members,
  update_touch_times_for_contact_associations,
  update_touch_times_for_contacts,
  update_touch_times_for_task
} = require('./worker')

const Context = require('../../Context')
const Contact = require('../../Contact')
const ContactList = require('../../Contact/list')
const CrmAssociation = require('../Association')
const CrmTask = require('../Task')

function updateContactNextTouch(contacts) {
  update_touch_times_for_contacts({ contacts })
}

/**
 * @param {Array<{created_by: UUID; id: UUID;}>} associations 
 */
function updateTouchTimesForContactAssociation(associations) {
  update_touch_times_for_contact_associations({ associations })
}

function updateTouchTimesAfterAssociationDelete(associations) {
  const contacts = associations.filter(a => a.contact && a.crm_task).map(a => a.contact)

  if (contacts.length > 0) {
    update_touch_times_for_contacts({ contacts })
  }
}

function updateContactNextTouchForList(list_id) {
  update_next_touch_for_list_members({ list_id })
}

function updateContactTouchTimesForTask({ task_id }) {
  update_touch_times_for_task({ task_id })
}

function onTaskDelete({ task }) {
  update_touch_times_for_contacts({ contacts: task.contacts })
  updateContactTouchTimesForTask({ task_id: task.id })
}

function onUpdateContactsBrand({ contact_ids }) {
  update_touch_times_for_contacts({ contacts: contact_ids })
}

function logAndHandle(fn, msg) {
  return (...args) => {
    Context.log(msg)
    fn.apply(null, args)
  }
}

module.exports = function attachEventHandlers() {
  const l = logAndHandle

  ContactList.on('update', l(updateContactNextTouchForList, 'ContactList:update'))

  CrmAssociation.on('create', l(updateTouchTimesForContactAssociation, 'CrmAssociation:create'))
  CrmAssociation.on('delete', updateTouchTimesAfterAssociationDelete)

  CrmTask.on('update', updateContactTouchTimesForTask)
  CrmTask.on('delete', onTaskDelete)

  Contact.on('update:brand', onUpdateContactsBrand)
  Contact.on('list:join', updateContactNextTouch)
  Contact.on('list:leave', updateContactNextTouch)
}
