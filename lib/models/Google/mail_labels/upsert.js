const db = require('../../../utils/db.js')


const upsertLabels = async (cid, labels) => {
  return db.insert('google/mail_labels/upsert', [cid, JSON.stringify(labels)])
}



module.exports = {
  upsertLabels
}