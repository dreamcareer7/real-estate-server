const db = require('../../../utils/db.js')



/**
 * @param {UUID} credentialId
 */
const removeFoldersByCredential = async (credentialId) => {
  await db.select('microsoft/contact_folder/remove_by_credential', [credentialId])
}

/**
 * @param {UUID[]} ids
 */
const deleteMany = async function (ids) {
  await db.select('microsoft/contact/delete', [ids])
}

/**
 * @param {UUID[]} ids
 */
const restoreMany = async function (ids) {
  await db.select('microsoft/contact/restore', [ids])
}


/**
 * @param {UUID[]} ids
 */
const hardDelete = async function (ids) {
  await db.select('microsoft/contact/hard_delete', [ids])
}


module.exports = {
  removeFoldersByCredential,
  deleteMany,
  restoreMany,
  hardDelete
}