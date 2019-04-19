const db = require('../lib/utils/db')
const fs = require('fs')

const ids = fs.readFileSync(`${__dirname}/application_fee.csv`, 'UTF-8').trim().split(/\n/g).join(',')
const sql = `UPDATE listings SET application_fee_yn = TRUE
             WHERE matrix_unique_id IN(${ids})`

const run = async () => {
  const conn = await db.conn.promise()

  /*
   * Turns out update listings is super super slow because it triggers
   * an update on listings filters.
   * That trigger is super slow as it relies on a DELETE based on MUI which is not indexed.
   */
  await conn.query('CREATE INDEX listings_filters_matrix_unique_id ON listings_filters(matrix_unique_id)')
  await conn.query(sql)

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
