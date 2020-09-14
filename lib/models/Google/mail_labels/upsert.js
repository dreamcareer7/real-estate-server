const db = require('../../../utils/db.js')


/**
 * @param {UUID} cid
 * @param {Object} labels
 */
const upsertLabels = async (cid, labels) => {
  return db.insert('google/mail_labels/upsert', [cid, JSON.stringify(labels)])
}


module.exports = {
  upsertLabels
}