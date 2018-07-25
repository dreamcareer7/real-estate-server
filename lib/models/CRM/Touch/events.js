const { enqueueJob } = require('../../../utils/worker')

const Contact = require('../../Contact')

function updateContactNextTouch(contacts) {
  enqueueJob('touches', 'update_next_touch', { contacts })
}

module.exports = function attachEventHandlers() {
  Contact.on('list:join', updateContactNextTouch)
  Contact.on('list:leave', updateContactNextTouch)
}
