const db = require('../../../utils/db.js')


/**
 * @param {UUID} credentialId
 */
const removeFoldersByCredential = async (credentialId) => {
  await db.select('microsoft/contact_folder/remove_by_credential', [credentialId])
}


module.exports = {
  removeFoldersByCredential
}