const { stop_flow_for_contacts } = require('./worker')

const Contact = require('../Contact/emitter')

/**
 * Called when contacts are deleted
 */
function onDeleteContacts({ contact_ids, user_id }) {
  stop_flow_for_contacts({ contacts: contact_ids, user: user_id })
}

module.exports = function attachEventHandlers() {
  Contact.on('delete', onDeleteContacts)
}
