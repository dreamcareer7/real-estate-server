const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const GoogleMailLabel = {}



GoogleMailLabel.upsertLabels = async (cid, labels) => {
  return db.insert('google/mail_labels/upsert', [cid, JSON.stringify(labels)])
}

GoogleMailLabel.getAll = async (ids) => {
  return await db.select('google/mail_labels/get', [ids])
}

GoogleMailLabel.get = async (id) => {
  const records = await GoogleMailLabel.getAll([id])

  if (records.length < 1) {
    return null
  }

  return records[0]
}

GoogleMailLabel.getByCredential = async (cid) => {
  const result = await db.selectIds('google/mail_labels/get_by_credential', [cid])

  if ( result.length === 0 ) {
    return null
  }

  return GoogleMailLabel.get(result[0])
}



Orm.register('google_mail_label', 'GoogleMailLabel', GoogleMailLabel)

module.exports = GoogleMailLabel
