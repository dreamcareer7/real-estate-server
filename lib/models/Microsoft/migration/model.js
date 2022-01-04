const db = require('../../../utils/db.js')
const sq = require('@rechat/squel').useFlavour('postgres')

/**
 * This method will get contacts that do not have a new_remote_id
 * @param {*} credential Microsoft credential
 * @param {*} limit Limit of selected array
 * @param {*} offset Offset index for pagination
 */
const getContactsWithOldId = async (credential, limit = 50, offset = 0) => {
  return db.select('microsoft/migration/get_contacts_without_new_id', [credential, limit, offset])
}

/**
 * Get all available credentials ready for migration
 */
const getAvailableCredentials = async () => {
  return await db.select('microsoft/migration/get_credentials_ready_for_migration')
}


/**
 * @param {UUID} id
 * @param {String} status
 */
const updateContactMigrationStatus = async (id, status) => {
  const q = sq.update()
    .table('microsoft_credentials')
    .setFields({
      contact_migration_status: status,
    })
    .set('updated_at = now()')
    .where('id = ?', id)

  // @ts-ignore
  q.name = 'microsoft/credential/update_sync_tokens'
  return db.update(q)
}

/**
 * Update the remote_id and new_remote_id with json to record set
 * @param {*} data Data to create ne table for update
 */
const updateContactIds = async (data) => {
  return db.select('microsoft/migration/update_contacts_based_on_new_ids', [data])
}

module.exports = {
  getContactsWithOldId,
  getAvailableCredentials,
  updateContactMigrationStatus,
  updateContactIds,
}