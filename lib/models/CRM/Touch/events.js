const { enqueueJob } = require('../../../utils/worker')

const Job = require('../../Job')
const Contact = require('../../Contact')
const ContactList = require('../../Contact/list')

function updateContactNextTouch(contacts) {
  enqueueJob('touches', 'update_next_touch', { contacts })
}

module.exports = function attachEventHandlers() {
  Contact.on('list:add', updateContactNextTouch)
  Contact.on('list:remove', updateContactNextTouch)
}
