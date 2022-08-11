const db = require('../../../utils/db.js')

/**
 * This method will get contacts that do not have a new_remote_id
 */
const getContactsWithoutNewId = async () => {
  return db.select('microsoft/migration/get_contacts_without_new_id', [])
}

/**
 * This method will get messages that do not have a new_message_id
 */
const getMessagesWithoutNewId = async () => {
  return db.select('microsoft/migration/get_messages_without_new_id', [])
}

/**
 * Update the remote_id and new_remote_id with json to record set
 * @param {*} data Data to create ne table for update
 */
const updateContactIds = async (data) => {
  return db.select('microsoft/migration/update_contacts_based_on_new_ids', [JSON.stringify(data)])
}


/**
 * Update the message_id and new_message_id with json to record set
 * @param {*} data Data to create ne table for update
 */
const updateMessageIds = async (data) => {
  return db.select('microsoft/migration/update_messages_based_on_new_ids', [JSON.stringify(data)])
}

module.exports = {
  getContactsWithoutNewId,
  getMessagesWithoutNewId,
  updateContactIds,
  updateMessageIds,
}
