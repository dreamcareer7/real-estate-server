const { enqueueJob } = require('../../../utils/worker')

const Contact = require('../../Contact')
const ContactList = require('../../Contact/list')

function updateContactNextTouch(contacts) {
  enqueueJob('touches', 'update_next_touch', { contacts })
}

function updateContactNextTouchForList(list_id) {
  enqueueJob('touches', 'update_next_touch_for_list_members', { list_id })
}

module.exports = function attachEventHandlers() {
  ContactList.on('update', updateContactNextTouchForList)

  Contact.on('list:join', updateContactNextTouch)
  Contact.on('list:leave', updateContactNextTouch)
}
