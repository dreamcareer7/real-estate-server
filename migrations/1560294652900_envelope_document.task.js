const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE envelopes_documents ADD task uuid REFERENCES tasks(id)',
  `UPDATE envelopes_documents SET task = (
    SELECT tasks.id FROM forms_data
    JOIN forms_submissions ON forms_data.submission = forms_submissions.id
    JOIN tasks ON tasks.submission = forms_submissions.id
    WHERE forms_data.id = envelopes_documents.submission_revision
  ) WHERE submission_revision IS NOT NULL`,
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
