const { enqueueJob } = require('../../../utils/worker')

const Context = require('../../Context')
const Contact = require('../../Contact')
const Tag = require('../../Contact/tag')
const ContactList = require('../../Contact/list')
const CrmAssociation = require('../Association')
const CrmTask = require('../Task')

function updateContactNextTouch(contacts) {
  enqueueJob('touches', 'update_touch_times_for_contacts', { contacts })
}

/**
 * @param {Array<{created_by: UUID; brand: UUID; id: UUID;}>} associations 
 */
function updateTouchTimesForContactAssociation(associations) {
  enqueueJob('touches', 'update_touch_times_for_contact_associations', { associations })
}

function updateContactNextTouchForList(list_id) {
  enqueueJob('touches', 'update_next_touch_for_list_members', { list_id })
}

function updateContactTouchTimesForTask({ task_id, brand }) {
  enqueueJob('touches', 'update_touch_times_for_task', { task_id, brand })
}

function onTaskDelete({ task, brand_id }) {
  enqueueJob('touches', 'update_touch_times_for_contacts', { contacts: task.contacts, brand: brand_id })
  updateContactTouchTimesForTask({ task_id: task.id, brand: brand_id })
}

function onUpdateContactsBrand({ contact_ids, brand_id }) {
  enqueueJob('touches', 'update_touch_times_for_contacts', { contacts: contact_ids, brand: brand_id })
}

function onUpdateTag({ brand, tag }) {
  enqueueJob('touches', 'update_touch_times_for_tag', { tag, brand })
}

function onDeleteTag({ brand, contacts }) {
  enqueueJob('touches', 'update_touch_times_for_contacts', { contacts, brand })
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
  CrmAssociation.on('delete', updateTouchTimesForContactAssociation)

  CrmTask.on('update', updateContactTouchTimesForTask)
  CrmTask.on('delete', onTaskDelete)

  Contact.on('update:brand', onUpdateContactsBrand)
  Contact.on('list:join', updateContactNextTouch)
  Contact.on('list:leave', updateContactNextTouch)

  Tag.on('update:touch_freq', onUpdateTag)
  Tag.on('delete', onDeleteTag)
}
