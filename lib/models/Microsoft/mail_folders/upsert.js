const db = require('../../../utils/db.js')


/**
 * @param {UUID} cid
 * @param {Object} folders
 */
const upsertFolders = async (cid, folders) => {
  return db.insert('microsoft/mail_folders/upsert', [cid, JSON.stringify(folders)])
}


module.exports = {
  upsertFolders
}