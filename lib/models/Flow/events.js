const { enqueueJob } = require('../../utils/worker')

const Contact = require('../Contact')

/**
 * Called when contacts are deleted
 */
function onDeleteContacts({ contact_ids, user_id }) {
  enqueueJob('flow', 'stop_flow_for_contacts', { contacts: contact_ids, user: user_id })
}

module.exports = function attachEventHandlers() {
  Contact.on('delete', onDeleteContacts)
}
