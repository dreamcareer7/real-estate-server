const db = require('../../../utils/db.js')


const upsertFolders = async (cid, folders) => {
  return db.insert('microsoft/mail_folders/upsert', [cid, JSON.stringify(folders)])
}


module.exports = {
  upsertFolders
}